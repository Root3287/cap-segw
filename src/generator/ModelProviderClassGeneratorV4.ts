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
		writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set,");
		writer.writeLine(`referenced_entity TYPE ${this._class.name}=>t_${entityName}.`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine(`entity_type = model->create_entity_type( '${entityName.toUpperCase()}' ).`);

		// Doesn't Do Deep Reference
		// writer.writeLine("entity_type = model->create_entity_type_by_struct( ").increaseIndent();
		// writer.writeLine(`iv_entity_type_name = '${entityName.toUpperCase()}'`);
		// writer.writeLine(`is_structure = referenced_entity`);
		// writer.writeLine(`iv_add_conv_to_prim_props = abap_true`);
		// writer.writeLine(`iv_add_f4_help_to_prim_props = abap_true`);
		// writer.writeLine(`iv_gen_prim_props = abap_true`);
		// writer.decreaseIndent().writeLine(").").writeLine();

		writer.writeLine(`" Set External EDM name for entity type`);
		writer.writeLine(`entity_type->set_edm_name( |${entityName}| ).`).writeLine();

		for(let element of entity?.elements ?? []){
			this._processElement(writer, element, "entity_type");
		}

		writer.writeLine(`" Create Entity Set`);
		writer.writeLine(`entity_set = entity_type->create_entity_set( '${entityName.toUpperCase()}_SET' ).`);
		// writer.writeLine(`entity_set->set_edm_name( ).`);
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
				...this._entityDefineMethods.map((method) => `me->${method}( io_model ).`),
				"me->define_actions( io_model )."
			],
		};

		generator.setABAPClass(this._class);
		return generator.generate();
	}

	private _processElement(writer: CodeWriter, element: any, varName: string){
		let primitive = CDSUtils.cds2edm((<any>element.type));
		let elementPrototype = Object.getPrototypeOf(element);

		let elementName = ABAPUtils.getABAPName(element.name);
		let elementNameInternal = ABAPUtils.getABAPName(element.name).toUpperCase();

		if(primitive || CDSUtils.cds2edm(elementPrototype.type)){
			writer.writeLine(`primitive_property = ${varName}->create_prim_property( '${elementNameInternal}' ).`);
			writer.writeLine(`primitive_property->set_edm_name( '${elementName}' ).`);

			let primitiveType = CDSUtils.cds2edm(elementPrototype.type) ?? primitive;

			writer.writeLine(`primitive_property->set_edm_type( '${primitiveType?.substring(4)}' ).`);

			if(element?.key)
				writer.writeLine(`primitive_property->set_is_key( ).`);
			if(!element?.key && !element?.notNull)
				writer.writeLine(`primitive_property->set_is_nullable( ).`);
			if(primitive !== "edm.Guid" && (<any>element)?.length)
				writer.writeLine(`primitive_property->set_max_length( '${(<any>element).length}' ).`);
		}else if(
			(element.type === "cds.Composition" || element.type === "cds.Association") ||
			(elementPrototype.type === "cds.Composition" || elementPrototype.type === "cds.Association")
		){
			writer.writeLine(`nav_property = ${varName}->create_navigation_property( '${elementNameInternal}' ).`);
			writer.writeLine(`nav_property->set_edm_name( '${elementName}' ).`);
			// writer.writeLine(`nav_property->set_partner( iv_partner = '' iv_complex_property_path = '' ).`);
			// writer.writeLine(`nav_property->set_target_entity_type_name( iv_entity_type_name = '' iv_service_ref_name = '' ).`);
			// 1 - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one
			// O - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one_optional
			// N - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_many_optional
			let multiplicity = (element?.is2many) ? 'N' : 'O';
			if(element?.["notNull"] && multiplicity === 'O') multiplicity = '1';
			writer.writeLine(`nav_property->set_target_multiplicity( '${multiplicity}' ).`);
			// writer.writeLine(`nav_property->add_referential_constraint( iv_source_property_path = '' iv_target_property_path = '' ).`);
		}else if(
			(elementPrototype.kind === "type" ) &&
			!(
				element.type === "cds.Composition" ||
				element.type === "cds.Association" ||
				elementPrototype.type === "cds.Composition" ||
				elementPrototype.type === "cds.Association"
			)
		) {
			this._complexTypes[ABAPUtils.getABAPName(elementPrototype).toUpperCase()] ??= elementPrototype;
			writer.writeLine(`complex_property = ${varName}->create_complex_property( '${elementNameInternal}' ).`);
			writer.writeLine(`complex_property->set_edm_name( '${elementName}' ).`);
			writer.writeLine(`complex_property->set_complex_type( '${ABAPUtils.getABAPName(elementPrototype).toUpperCase()}' ).`);
			if(!element?.notNull)
				writer.writeLine(`complex_property->set_is_nullable( ).`);
		}
		writer.writeLine()
	}

	private _processActions(service: any){
		let actions = {};

		let writer = new CodeWriter();

		writer.writeLine("data primitive type ref to /iwbep/if_v4_med_prim_type.");
		writer.writeLine("data action type ref to /iwbep/if_v4_med_action.");
		writer.writeLine("data action_import type ref to /iwbep/if_v4_med_action_imp.");
		writer.writeLine("data action_parameter type ref to /iwbep/if_v4_med_act_param.");
		writer.writeLine("data action_return type ref to /iwbep/if_v4_med_act_return.");
		writer.writeLine();
		writer.writeLine("data function type ref to /iwbep/if_v4_med_function.");
		writer.writeLine("data function_import type ref to /iwbep/if_v4_med_func_imp.");
		writer.writeLine("data function_parameter type ref to /iwbep/if_v4_med_func_param.");
		writer.writeLine("data function_return type ref to /iwbep/if_v4_med_func_return.");
		writer.writeLine();

		Object.keys(service?.actions ?? {}).forEach((action: any) => {
			this._writeActions(writer, service?.actions[action]);
		});

		(Object.values(service.entities) ?? []).forEach((entity: any) => {
			Object.keys(entity?.actions ?? {}).forEach((action: any) => {
				this._writeActions(writer, entity?.actions[action]);
			});
		});

		let code = writer.generate().split('\n');
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

	private _writeActions(writer: CodeWriter, action: any): void {
		let getActionName = (action: any): string => {
			if(action?.["@segw.name"]){
				return action?.["@segw.name"];
			}
			return action.name;
		}

		// Functions must have a return type
		if(action.kind === "function" && !action?.returns) LOG.warn(`Function ${action.name} must have a return type!`);

		// Function Imports must have an entity set
		if(action.kind === "function" && !action?.parent && Object.getPrototypeOf(action?.returns?.items ?? action?.returns)?.kind !== "entity" )
			LOG.warn(`Function Import ${action.name} must be an entity!`);

		// Neteeaver 7.50 Does not support Collection of Complex Types
		if(action?.returns?.items && Object.getPrototypeOf(action?.returns?.items) === "type")
			LOG.warn(`Collection of Complex Types are not supported in operation ${action.name}`);

		// Netweaver 7.50 Only support returning Entity Types for bounded operations
		if(action?.parent && action?.returns && Object.getPrototypeOf(action?.returns?.items ?? action?.returns)?.kind !== "entity")
			LOG.warn(`Bounded Operations ${action.name} only support returning Entity Types`);

		let actionName = ABAPUtils.getABAPName(getActionName(action));
		let actionABAPName = ABAPUtils.getABAPName((<any>action)?.["@segw.abap.name"] ?? getActionName(action)).replace(/\./g, '_');

		let primitivePrefix = "";
		if(action?.kind === "function"){
			primitivePrefix = "FUNC";
		}
		if(action?.kind === "action"){
			primitivePrefix = "ACT";
		}
		primitivePrefix += `_${actionABAPName.toUpperCase()}_`;

		// TODO: This could be re-written as the following ABAP
		// try.
		// 	action = model->get_action( |${actionName| ).
		// catch /iwbep/cx_gateway.
		// 	action = model->create_action( |${actionName}| ).
		// endtry.
		writer.writeLine(`${action.kind} = model->create_${action.kind}( |${actionName.toUpperCase()}| ).`);
		
		if(!action?.parent){
			writer.writeLine(`${action.kind}_import = ${action.kind}->create_${action.kind}_import( |${actionABAPName.toUpperCase()}| ).`);
			writer.writeLine(`${action.kind}_import->set_edm_name( '${actionName}' ).`);
		}else{
			writer.writeLine(`${action.kind}_parameter = ${action.kind}->create_parameter( 'PARENT' ).`);
			writer.writeLine(`${action.kind}_parameter->set_is_binding_parameter( ).`);
			writer.writeLine(`${action.kind}_parameter->set_entity_type( '${ABAPUtils.getABAPName(action.parent).toUpperCase()}' ).`);
		}
		writer.writeLine();

		for(let param of (action?.params ?? [])) {

			let paramPrototype = Object.getPrototypeOf(param);
			let primitive = CDSUtils.cds2edm(param.type);

			// Skip Complex type for now...
			if(paramPrototype?.kind === "type") continue;

			writer.writeLine(`${action.kind}_parameter = ${action.kind}->create_parameter( '${param.name.toUpperCase()}' ).`);
			if(primitive){
				let paramName = `${primitivePrefix}${ABAPUtils.getABAPName(param).toUpperCase()}`;
				if(paramName.length > 30) LOG.warn(`${paramName} is too long consider shortening with "@segw.abap.name".`);

				writer.writeLine(`primitive = model->create_primitive_type( |${paramName}| ).`);
				writer.writeLine(`primitive->set_edm_type( '${primitive.substr(4)}' ).`);
				writer.writeLine(`${action.kind}_parameter->set_primitive_type( '${paramName}' ).`);
			}else if(paramPrototype?.kind === "entity"){
				writer.writeLine(`${action.kind}_parameter->set_entity_type( '${ABAPUtils.getABAPName(paramPrototype).toUpperCase()}' ).`);
			}else if(paramPrototype?.kind === "type"){
				// TODO: Flatten Complex Param
			}
		}

		writer.writeLine();

		// TODO: Collection of Complex Type are not supported

		writer.writeLine(`${action.kind}_return = ${action.kind}->create_return( ).`);
		if(!action?.returns){
			writer.writeLine(`${action.kind}_return->set_is_nullable( ).`);
		}else{
			let returnEntity = Object.getPrototypeOf(("items" in action?.returns) ? action.returns.items : action.returns);
			let returnPrimative = CDSUtils.cds2edm(action.returns.type);
			let returnPrimativeName = `${primitivePrefix}R`;

			if("items" in action?.returns){
				writer.writeLine(`${action.kind}_return->set_is_collection( ).`);
			}

			if(returnPrimative){
				if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
				writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
				writer.writeLine(`primitive->set_edm_type( '${returnPrimative.substr(4)}' ).`);
				writer.writeLine(`${action.kind}_return->set_primitive_type( '${returnPrimativeName}' ).`);
			}else if(returnEntity?.kind === "type"){
				if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
				writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
				writer.writeLine(`primitive->set_edm_type( 'String' ).`);
				writer.writeLine(`${action.kind}_return->set_primitive_type( '${returnPrimativeName}' ).`);
				// writer.writeLine(`${action.kind}_return->set_complex_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
			}else if(returnEntity?.kind === "entity"){
				let returnEntityName = ABAPUtils.getABAPName(returnEntity).toUpperCase();
				writer.writeLine(`${action.kind}_return->set_entity_type( '${returnEntityName}' ).`);
				if(!action?.parent)
					writer.writeLine(`${action.kind}_import->set_entity_set_name( '${returnEntityName}_SET' ).`);
			}
		}
		writer.writeLine();
	}
}