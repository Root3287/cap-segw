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

import CDSTypeConverter from "../converters/CDSTypeConverter";

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
		return `ZCL_${ABAPUtils.getABAPName(service)}_MPC.abap`;
	}

	public addEntity(entity: entity): void {
		if((<any>entity)?.["@segw.ignore"]){
			return;
		}

		let entityName = ABAPUtils.getABAPName(entity);

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
			raising: [ "/iwbep/cx_gateway"]
		};

		let writer = new CodeWriter();
		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("entity_type TYPE REF TO /iwbep/if_v4_med_entity_type,");
		writer.writeLine("property TYPE REF TO /iwbep/if_v4_med_prim_prop,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set,");
		writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		// TODO: Create Types
		// writer.writeLine(`referenced_entity TYPE ${this._class.name}~${this._class.publicSection.types[entity.name]}`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine("entity_type = io_model->create_entity_type_by_struct( ").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine(`iv_entity_type_name = ${entity.name}`);
		writer.writeLine(`is_structure = referenced_entity`);
		writer.writeLine(`iv_add_conv_to_prim_props = abap_true`);
		writer.writeLine(`iv_add_f4_help_to_prim_props = abap_true`);
		writer.writeLine(`iv_gen_prim_props = abap_true`);
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").").writeLine();

		writer.writeLine(`" Set External EDM name for entity type`);
		writer.writeLine(`entity_type->set_edm_name( |${entityName}| ).`).writeLine();

		writer.writeLine(`" Rename External EDM names so CamelCase notation is used`);
		writer.writeLine(`entity_type->get_primative_properties( IMPORTING et_property = primative_properties ).`);
		writer.writeLine(`LOOP AT primative_properties INTO DATA(primative_property).`).increaseIndent();
		writer.writeLine(`primative_properties->set_edm_name( to_mixed( val = primative_property->get_internal_name( ) ) ).`).decreaseIndent();
		writer.writeLine(`ENDLOOP.`).writeLine();

		writer.writeLine(`" Set Key Fields`);

		writer.writeLine(`" Create Navigation Property`);

		writer.writeLine(`" Create Entity Set`);
		writer.writeLine(`entity_set = entity_type->create_entity_set( '${entityName}' ).`);
		writer.writeLine(`entity_set->set_edm_name( ).`);

		writer.writeLine(`" Add the binding of the navigation path`);
		writer.writeLine();

		defineEntityMethod.code = writer.generate().split("\n");
		this._entityDefineMethods.push(methodName);
		this._class.protectedSection.methods[methodName] = defineEntityMethod;
	};

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		let typeConverter = new CDSTypeConverter();
		typeConverter.setService(service);
		if(this._class?.publicSection?.types)
			this._class.publicSection.types = typeConverter.getABAPTypes();
		
		// Generate defines
		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		// let associations = this._getAssociations(service);
		// this._writeAssociations(associations);

		this.class.publicSection.methods["/iwbep/if_v4_mp_basic~define"] = {
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_v4_mp_basic~define",
			isRedefinition: true,
			code: [
				...this._entityDefineMethods.map((method) => `me->${method}( io_model ).`)
			],
		};

		generator.setABAPClass(this._class);
		return generator.generate();
	}
}