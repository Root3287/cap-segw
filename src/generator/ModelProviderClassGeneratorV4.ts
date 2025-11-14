import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator";
import { 
	Class as ABAPClass, 
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod, 
	MethodType as ABAPMethodType, 
	ParameterReferenceType as ABAPParameterReferenceType
} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import CodeWriter from "./CodeWriter";

import ComplexMPCV4Writer from "../writers/ComplexMPCV4Writer";
import EntityMPCV4Writer from "../writers/EntityMPCV4Writer";
import OperationMPCV4Writer from "../writers/OperationMPCV4Writer";
import OperationMPCV4CSDLWriter from "../writers/OperationMPCV4CSDLWriter";

import CDSV4TypeConverter from "../converters/CDSV4TypeConverter";
import { CDS as CDSUtils } from "../utils/CDS";

import { ABAP as ABAPUtils } from "../utils/ABAP";

import cds, { entity, struct } from "@sap/cds";

const LOG = cds.log("segw");

export default class ModelProviderClassGeneratorV4 implements IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: [],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
			types: [],
			methods: {},
		},
		protectedSection: {
			type: ABAPClassSectionType.PROTECTED,
			methods: {},
		},
		privateSection: {
			type: ABAPClassSectionType.PRIVATE,
			methods: {},
		}, 
	};

	private _entityDefineMethods: string[] = [];
	private _complexTypes: Record<string, any> = {};
	private _compilerInfo?: CompilerInfo;

	public constructor(){
		this._class.inheriting?.push("/iwbep/cl_v4_abs_model_prov");
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public getFileName(): string { 
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		if(!service) return `ZCL_${ABAPUtils.getABAPName(namespace)}_MPC.abap`;
		if((<any>service)?.["@segw.name"]) return `ZCL_${(<any>service)?.["@segw.name"]}_MPC.abap`;
		return `ZCL_${ABAPUtils.getABAPName(service.name.split('.').at(-1))}_MPC.abap`;
	}

	public addEntity(entity: entity): void {
		if((<any>entity)?.["@segw.ignore"]){
			return;
		}

		let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');

		if(entityName.length > 128){
			LOG.warn(`${entityName} too long. Consider shortening it with @segw.name`);
		}
		
		const methodName = ((<any>entity)?.["@segw.mpc.define.name"]) ?? `define_${entityName}`;
		
		if(methodName > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with @segw.mpc.define.name`);
		}

		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		if(methodName in this._class.protectedSection.methods){
			LOG.warn(`Entity ${entityName} has already been defined. Skipping`);
			return;
		}
		
		let defineEntityMethod: ABAPMethod = {
			type: ABAPMethodType.MEMBER,
			importing: [
				{name: "model", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_v4_med_model"}
			],
			raising: [ "/iwbep/cx_gateway"],
		};

		let entityWriter = new EntityMPCV4Writer();
		let cdsEntityName = (<any>entity.name.substring((<any>entity)._service.name.length+1).replace(/\./g, '_'))
		let csdlEntity = this._compilerInfo?.csdl[(<any>entity)._service.name][cdsEntityName];
		entityWriter.setEntity(entity, csdlEntity);
		entityWriter.setCompilerInfo(this._compilerInfo);

		defineEntityMethod.code = entityWriter.generate().split("\n");
		this._entityDefineMethods.push(methodName);
		this._class.protectedSection.methods[methodName] = defineEntityMethod;
	};

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		let typeConverter = new CDSV4TypeConverter();
		typeConverter.setService(service);
		typeConverter.setCSDL(this._compilerInfo?.csdl);
		if(this._class?.publicSection?.types)
			this._class.publicSection.types = typeConverter.getABAPTypes();

		// Generate defines
		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		this._processComplexTypes(service);
		this._processActions(service);

		// let associations = this._getAssociations(service);
		// this._writeAssociations(associations);
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods["/iwbep/if_v4_mp_basic~define"] = {
			type: ABAPMethodType.MEMBER,
			isRedefinition: true,
			code: [
				`io_model->set_schema_namespace( '${namespace}' ).`,
				"me->define_complex( io_model ).",
				...this._entityDefineMethods.map((method) => `me->${method}( io_model ).`),
				"me->define_actions( io_model )."
			],
		};

		generator.setABAPClass(this._class);
		return generator.generate();
	}

	private _processComplexTypes(service: any){
		let writer = new ComplexMPCV4Writer();
		// writer.setComplexTypes(this._complexTypes);
		let code = writer.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PRIVATE };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[`define_complex`] = {
			type: ABAPMethodType.MEMBER,
			importing: [
				{ name: "model", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_v4_med_model"}
			],
			raising: ["/iwbep/cx_gateway"],
			code: code
		}
	}

	private _processActions(service: any){

		let operationWriter = new OperationMPCV4Writer();
		Object.keys(service?.actions ?? {}).forEach((action: any) => {
			operationWriter.addOperation(service?.actions[action]);
		});

		(Object.values(service.entities) ?? []).forEach((entity: any) => {
			Object.keys(entity?.actions ?? {}).forEach((action: any) => {
				operationWriter.addOperation(entity?.actions[action]);
			});
		});

		let operationWriterCSDL = new OperationMPCV4CSDLWriter();
		operationWriterCSDL.setCompilerInfo(this._compilerInfo);

		operationWriterCSDL.generate();

		let code = operationWriterCSDL.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[`define_actions`] = {
			type: ABAPMethodType.MEMBER,
			importing: [
				{ name: "model", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_v4_med_model"}
			],
			raising: ["/iwbep/cx_gateway"],
			code: code
		}
	}
}