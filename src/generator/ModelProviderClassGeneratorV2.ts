import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import {
	Cardinality,
	Class as ABAPClass, 
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod, 
	MethodType as ABAPMethodType,
	Primitive as ABAPPrimative,
	Parameter as ABAPParameter, 
	ParameterReferenceType as ABAPParameterReferenceType,
	Structure as ABAPStructure
} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import { Primitive as CDSPrimitive } from "../types/cds";
import CodeWriter from "./CodeWriter";

import AssociationMPCV2Writer from "../writers/AssociationMPCV2Writer";
import EntityMPCV2Writer from "../writers/EntityMPCV2Writer";
import OperationMPCV2Writer from "../writers/OperationMPCV2Writer";

import CDSTypeConverter from "../converters/CDSTypeConverter";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import cds, { csn, entity, struct } from "@sap/cds";

const LOG = cds.log("segw");

export default class ModelProviderClassGeneratorV2 implements IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: ["/iwbep/cl_mgw_push_abs_model"],
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

	private _compilerInfo?: CompilerInfo;

	public constructor(){
	
	}

	/**
	 * Set the Compiler information
	 * @param {CompilerInfo} compilerInfo Compiler Information from the front end
	 */
	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	/**
	 * Get the CDS service used for generation
	 */
	public getService(): any | undefined {
		const csdl: Record<string, any> = (this._compilerInfo as any)?.csdl ?? {};
		const schemaKey = Object.keys(csdl).find((k) => !k.startsWith("$"));
		const services: Record<string, any> = (this._compilerInfo?.csn as any)?.services ?? {};
		if (schemaKey && services[schemaKey]) {
			return services[schemaKey];
		}
		const first = Object.keys(services)[0];
		return services[first];
	}

	/**
	 * Get File name of the class
	 * @return {string} Class Filename
	 */
	public getFileName(): string {
		const service = this.getService();
		if(!service) return `ZCL_${ABAPUtils.getABAPName("SERVICE")}_MPC.abap`;
		if((<any>service)?.["@segw.name"]) return `ZCL_${(<any>service)?.["@segw.name"]}_MPC.abap`;
		const serviceLabel = service?.name?.split('.').at(-1) ?? "SERVICE";
		return `ZCL_${ABAPUtils.getABAPName(serviceLabel)}_MPC.abap`;
	}

	/**
	 * Add the entity to be processed
	 * @param {entity} entity Entity to be proccessed
	 */
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
			raising: [ "/iwbep/cx_mgw_med_exception"]
		};

		let writer = new EntityMPCV2Writer();
		writer.setClassName(this._class.name);
		writer.setEntity(entity);

		defineEntityMethod.code = writer.generate().split("\n");
		this._entityDefineMethods.push(methodName);
		this._class.protectedSection.methods[methodName] = defineEntityMethod;
	};

	/**
	 * Generate a MPC class
	 * @return {string} ABAP Class
	 */
	public generate(): string {
		const service = this.getService();
		const namespace = service?.name ?? "";
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];
		const generatedTimestamp = this._getGeneratedTimestamp();

		let typeConverter = new CDSTypeConverter();
		typeConverter.setService(service);
		if(this._class?.publicSection?.types)
			this._class.publicSection.types = typeConverter.getABAPTypes();

		
		// Generate defines
		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		let associations = this._getAssociations(service);
		this._writeAssociations(associations);

		this._processActions(service);

		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods["define"] = {
			type: ABAPMethodType.MEMBER,
			isRedefinition: true,
			code: [
				`model->set_schema_namespace( |${namespace}| ).`,
				"",
				...this._entityDefineMethods.map((method) => `me->${method}( ).`),
				"me->define_associations( ).",
				"me->define_actions( )."
			],
		};

		this._class.publicSection.methods["get_last_modified"] = {
			type: ABAPMethodType.MEMBER,
			isRedefinition: true,
			code: [
				`CONSTANTS: lc_gen_date_time TYPE timestamp VALUE '${generatedTimestamp}'.`,
				"rv_last_modified = super->get_last_modified( ).",
				"IF rv_last_modified LT lc_gen_date_time.",
				"\trv_last_modified = lc_gen_date_time.",
				"ENDIF."
			]
		};

		generator.setABAPClass(this._class);
		return generator.generate();
	}

	private _getGeneratedTimestamp(): string {
		const now = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		return [
			now.getUTCFullYear().toString(),
			pad(now.getUTCMonth() + 1),
			pad(now.getUTCDate()),
			pad(now.getUTCHours()),
			pad(now.getUTCMinutes()),
			pad(now.getUTCSeconds())
		].join("");
	}

	/**
	 * Get All Associations in the service
	 * @param {csn.Service} service Service to process
	 */
	private _getAssociations(service: any) {
		let isAssociation = (e: any) => e.type === CDSPrimitive.Composition || e.type === CDSPrimitive.Association;
		let associations: any = [];
		for(const entity of service?.entities ?? []){
			associations.push(
				...Object.values(entity.elements)?.filter(
					(element: any) => isAssociation(element) 
				) 
			);
		}
		return associations;
	}

	/**
	 * Write an ABAP method to that makes Associations
	 * @param {csn.Associations[]} associations Associations to write
	 */
	private _writeAssociations(associations: any[]): void {
		let writer = new AssociationMPCV2Writer();
		writer.setAssociations(associations);

		let code = writer.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods["define_associations"] = {
			type: ABAPMethodType.MEMBER,
			isRedefinition: true,
			code: code
		};
	}

	/**
	 * Process Service Actions
	 * @param {csn.Service} service Service to process actions
	 */
	private _processActions(service: any){
		let actions = {};

		Object.keys(service?.actions ?? {}).forEach((action: any) => {
			(<any>actions)[`${action}`] = service?.actions[action];
		});

		(Object.values(service.entities) ?? []).forEach((entity: any) => {
			Object.keys(entity?.actions ?? {}).forEach((action: any) => {
				(<any>actions)[`${ABAPUtils.getABAPName(entity)}.${action}`] = entity?.actions[action];
			});
		});

		let writer = new OperationMPCV2Writer();
		writer.setClassName(this.getFileName().substring(0, this.getFileName().length - 5));
		writer.setOperationsTypes(this._class?.publicSection?.types);
		writer.addOperations(actions);

		let code = writer.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods["define_actions"] = {
			type: ABAPMethodType.MEMBER,
			code: code
		};
	}
}
