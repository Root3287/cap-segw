import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator";
import { 
	Class as ABAPClass, 
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod, 
	MethodType as ABAPMethodType, 
	ParameterType as ABAPParameterType,
	ParameterReferenceType as ABAPParameterReferenceType
} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import CodeWriter from "./CodeWriter";
import { ABAP as ABAPUtils } from "../utils/ABAP";

import cds, { entity, struct } from "@sap/cds";

const LOG = cds.log("segw");

export default class DataProviderClassGeneratorV2 implements IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: ["/iwbep/cl_mgw_push_abs_data"],
		interfaces: [],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
			types: [],
			methods: [],
		},
		protectedSection: {
			type: ABAPClassSectionType.PROTECTED,
			parameters: [],
			methods: [],
		},
		privateSection: {
			type: ABAPClassSectionType.PRIVATE,
			methods: [],
		}, 
	};

	private _entityDefineMethods: string[] = [];
	private _namespace: string = "";

	private _compilerInfo?: CompilerInfo;

	public constructor(){
		this._class?.interfaces?.push("/IWBEP/IF_SB_DPC_COMM_SERVICES");
		this._class?.interfaces?.push("/IWBEP/IF_SB_GEN_DPC_INJECTION");

		this._class?.protectedSection?.parameters?.push({
			parameterType: ABAPParameterType.MEMBER,
			name: "_injection",
			referenceType: ABAPParameterReferenceType.TYPE_REF,
			type: "/iwbep/if_sb_gen_dpc_injection"
		});
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public getFileName(): string { 
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		return `ZCL_${ABAPUtils.getABAPName(service)}_DPC.abap`;
	}

	public addEntity(entity: entity): void {
		let entityName = ABAPUtils.getABAPName(entity);

		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let entityReturnType = `ZCL_${ABAPUtils.getABAPName(service)}_MPC=>T_${entityName}`;
		
		if(entityName.length > 30){
			LOG.warn(`Method ${entityName} too long. Consider shortening it with @segw.name`);
		}

		this._createEntity(entityName, entityReturnType);
		this._deleteEntity(entityName, entityReturnType);
		this._getEntity(entityName, entityReturnType);
		this._getEntitySet(entityName, entityReturnType);
		this._updateEntity(entityName, entityReturnType);

		// let writer = new CodeWriter();
		// defineEntityMethod.code = writer.generate().split("\n");
		// this._entityDefineMethods.push(defineEntityMethod.name);
		// this._class?.protectedSection?.methods?.push(defineEntityMethod);
	};

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		// TODO: Generate Types
		
		// Generate defines
		let actions = {};

		Object.keys(service?.actions ?? {}).forEach((actionKey: string) => {
			let actionName = (actionKey.split('.').length) ? actionKey.split('.').at(-1) : actionKey;
			(<any>actions)[`${ABAPUtils.getABAPName(actionName)}`] = service?.actions[actionKey];
		});

		for(const entity of service?.entities ?? []){
			Object.keys(entity?.actions ?? {}).forEach((action) => {
				(<any>actions)[`${ABAPUtils.getABAPName(entity)}.${action}`] = entity?.actions[action];
			});

			this.addEntity(entity);
		}

		this._handleGetEntitySet();
		this._handleGetEntity();
		this._handleUpdateEntity();
		this._handleCreateEntity();
		this._handleDeleteEntity();

		this._handleActions(actions);

		generator.setABAPClass(this._class);
		return generator.generate();
	}

	/**
	 * Write the method for `entity_create_entity`
	 * @param {string} entityName Name of Entity
	 * @param {string} entityReturnType Return type of Entity
	 */
	protected _createEntity(entityName: string, entityReturnType: string){
		let methodName = `${entityName}_create_entity`;
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: methodName,
			importing: [
				{ name: "entity_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "entity_set_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "source_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "key_tab", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_name_value_pair" },
				{ name: "tech_request_context", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity_c", isOptional: true },
				{ name: "navigation_path", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/t_mgw_navigation_path"},
				{ name: "data_provider", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_entry_provider", isOptional: true }
			],
			returning: { name: "entity", referenceType: ABAPParameterReferenceType.TYPE, type: entityReturnType },
			raising: [
				"/iwbep/cx_mgw_busi_exception", 
				"/iwbep/cx_mgw_tech_exception"
			],
			code: [
				"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
				"\tEXPORTING",
				"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
				`\t\tmethod = ${methodName}.`
			]
		});
	}

	/**
	 * Write the method for `entity_delete_entity`
	 * @param {string} entityName Name of Entity
	 * @param {string} entityReturnType Return type of Entity
	 */
	protected _deleteEntity(entityName: string, entityReturnType: string){
		let methodName = `${entityName}_delete_entity`;
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: methodName,
			importing: [
				{ name: "entity_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "entity_set_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "source_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "key_tab", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_name_value_pair" },
				{ name: "tech_request_context", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity_c", isOptional: true },
				{ name: "navigation_path", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/t_mgw_navigation_path"},
				{ name: "data_provider", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_entry_provider", isOptional: true }
			],
			raising: [
				"/iwbep/cx_mgw_busi_exception", 
				"/iwbep/cx_mgw_tech_exception"
			],
			code: [
				"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
				"\tEXPORTING",
				"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
				`\t\tmethod = ${methodName}.`
			]
		});
	}

	/**
	 * Write the method for `entity_get_entity`
	 * @param {string} entityName Name of Entity
	 * @param {string} entityReturnType Return type of Entity
	 */
	protected _getEntity(entityName: string, entityReturnType: string){
		let methodName = `${entityName}_get_entity`;
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: methodName,
			importing: [
				{ name: "entity_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "entity_set_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "source_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "key_tab", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_name_value_pair" },
				{ name: "request_object", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity", isOptional: true },
				{ name: "tech_request_context", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity_c", isOptional: true },
				{ name: "navigation_path", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/t_mgw_navigation_path"},
			],
			exporting: [
				{ name: "response_context", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/if_mgw_appl_srv_runtime=>ty_s_mgw_response_entity_cntxt"},
			],
			returning: { name: "entity", referenceType: ABAPParameterReferenceType.TYPE, type: entityReturnType },
			raising: [
				"/iwbep/cx_mgw_busi_exception", 
				"/iwbep/cx_mgw_tech_exception"
			],
			code: [
				"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
				"\tEXPORTING",
				"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
				`\t\tmethod = ${methodName}.`
			]
		});
	}

	/**
	 * Write the method for `entity_get_entityset`
	 */
	protected _getEntitySet(entityName: string, entityReturnType: string){
		let methodName = `${entityName}_get_entity_set`;
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: methodName,
			importing: [
				{ name: "entity_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "entity_set_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "source_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "filter_select_options", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_select_option" },
				{ name: "paging", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/s_mgw_paging" },
				{ name: "key_tab", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_name_value_pair" },
				{ name: "navigation_path", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/t_mgw_navigation_path"},
				{ name: "order", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_sorting_order" },
				{ name: "filter_string", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "search_string", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "tech_request_context", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity_c", isOptional: true },
			],
			exporting: [
				{ name: "response_context", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/if_mgw_appl_srv_runtime=>ty_s_mgw_response_entity_cntxt"},
			],
			returning: { name: "entity_set", referenceType: ABAPParameterReferenceType.TYPE, type: entityReturnType },
			raising: [
				"/iwbep/cx_mgw_busi_exception", 
				"/iwbep/cx_mgw_tech_exception"
			],
			code: [
				"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
				"\tEXPORTING",
				"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
				`\t\tmethod = ${methodName}.`
			]
		});
	}

	/**
	 * Write the method for `entity_update_entity`
	 * @param {string} entityName Name of Entity
	 * @param {string} entityReturnType Return type of Entity
	 */
	protected _updateEntity(entityName: string, entityReturnType: string){
		let methodName = `${entityName}_update_entity`;
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: `${entityName}_update_entity`,
			importing: [
				{ name: "entity_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "entity_set_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "source_name", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
				{ name: "key_tab", referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/t_mgw_name_value_pair" },
				{ name: "tech_request_context", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_req_entity_c", isOptional: true },
				{ name: "navigation_path", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/t_mgw_navigation_path"},
				{ name: "data_provider", referenceType: ABAPParameterReferenceType.TYPE_REF, type: "/iwbep/if_mgw_entry_provider", isOptional: true }
			],
			returning: { name: "entity", referenceType: ABAPParameterReferenceType.TYPE, type: entityReturnType },
			raising: [
				"/iwbep/cx_mgw_busi_exception", 
				"/iwbep/cx_mgw_tech_exception"
			],
			code: [
				"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
				"\tEXPORTING",
				"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
				`\t\tmethod = ${methodName}.`
			]
		});
	}

	protected _handleGetEntitySet(){
		let writer = new CodeWriter();

		writer.writeLine(`" TODO: Write Type MPC Type Def`).writeLine();
		writer.writeLine("DATA(entityset_name) = io_tech_request_context->get_entity_set_name( ).");
		writer.writeLine("DATA empty_entity type ref to data.");

		writer.writeLine("CASE entityset_name.").increaseIndent();
		
		for(let entity of [{}]){
			let entityName = "TEST";
			writer.writeLine(`WHEN '${entityName}'.`).increaseIndent();
			writer.writeLine(`me->${entityName}_get_entityset(`).increaseIndent();
			writer.writeLine("EXPORTING").increaseIndent();
			writer.writeLine(`entity_name = iv_entity_name`);
			writer.writeLine(`entityset_name = iv_entity_set_name`);
			writer.writeLine(`source_name = iv_source_name`);
			writer.writeLine(`filter_select_options = it_filter_select_options`);
			writer.writeLine(`order = it_order`);
			writer.writeLine(`paging = is_paging`);
			writer.writeLine(`navigation_path = it_navigation_path`);
			writer.writeLine(`key_tab = it_key_tab`);
			writer.writeLine(`filter_string = iv_filter_string`);
			writer.writeLine(`search_string = iv_search_string`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
			writer.writeLine(`response_context = es_response_context`);
			writer.decreaseIndent().writeLine("RETURNING").increaseIndent();
			writer.writeLine(`entity_set = data(${entityName}_get_entityset)`);
			writer.decreaseIndent();
			writer.decreaseIndent().writeLine(`).`);
			
			writer.writeLine();
			writer.writeLine(`me->copy_data_to_ref(`).increaseIndent();
			writer.writeLine(`EXPORTING`).increaseIndent();
			writer.writeLine(`is_data = ${entityName}_get_entityset`);
			writer.decreaseIndent().writeLine("CHANGING").increaseIndent();
			writer.writeLine(`cr_data = er_entityset`).decreaseIndent();
			writer.decreaseIndent().writeLine(`).`).writeLine();

			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~get_entityset(").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine(`iv_entity_name = iv_entity_name`);
		writer.writeLine(`iv_entityset_name = iv_entity_set_name`);
		writer.writeLine(`iv_source_name = iv_source_name`);
		writer.writeLine(`it_filter_select_options = it_filter_select_options`);
		writer.writeLine(`it_order = it_order`);
		writer.writeLine(`is_paging = is_paging`);
		writer.writeLine(`it_navigation_path = it_navigation_path`);
		writer.writeLine(`it_key_tab = it_key_tab`);
		writer.writeLine(`iv_filter_string = iv_filter_string`);
		writer.writeLine(`iv_search_string = iv_search_string`);
		writer.writeLine(`io_tech_request_context = io_tech_request_context`);
		writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
		writer.writeLine("er_entityset = er_entityset");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~get_entity_set",
			isRedefinition: true,
			code: code
		});
	}

	protected _handleGetEntity(){
		let writer = new CodeWriter();

		writer.writeLine(`" TODO: Write Type MPC Type Def`).writeLine();
		writer.writeLine("DATA(entityset_name) = io_tech_request_context->get_entity_set_name( ).");
		writer.writeLine("DATA empty_entity type ref to data.");

		writer.writeLine("CASE entityset_name.").increaseIndent();
		
		for(let entity of [{}]){
			let entityName = "TEST";
			writer.writeLine(`WHEN '${entityName}'.`).increaseIndent();
			writer.writeLine(`me->${entityName}_get_entity(`).increaseIndent();
			writer.writeLine("EXPORTING").increaseIndent();
			writer.writeLine(`entity_name = iv_entity_name`);
			writer.writeLine(`entityset_name = iv_entity_set_name`);
			writer.writeLine(`source_name = iv_source_name`);
			writer.writeLine(`data_provider = io_data_provider`);
			writer.writeLine(`key_tab = it_key_tab`);
			writer.writeLine(`navigation_path = it_navigation_path`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
			writer.writeLine(`response_context = es_response_context`);
			writer.decreaseIndent().writeLine("RETURNING").increaseIndent();
			writer.writeLine(`entity = data(${entityName}_get_entity)`);
			writer.decreaseIndent();
			writer.decreaseIndent().writeLine(`).`);

			writer.writeLine();
			writer.writeLine(`IF ${entityName}_get_entity is initial.`).increaseIndent();
			writer.writeLine(`er_entity = empty_entity.`);
			writer.writeLine(`break.`)
			writer.decreaseIndent().writeLine(`ENDIF.`);
			
			writer.writeLine();
			writer.writeLine(`me->copy_data_to_ref(`).increaseIndent();
			writer.writeLine(`EXPORTING`).increaseIndent();
			writer.writeLine(`is_data = ${entityName}_get_entity`);
			writer.decreaseIndent().writeLine("CHANGING").increaseIndent();
			writer.writeLine(`cr_data = er_entity`).decreaseIndent();
			writer.decreaseIndent().writeLine(`).`).writeLine();

			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~create_entity(").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine("iv_entity_name = iv_entity_name");
		writer.writeLine("iv_set_entity_name = iv_entity_set_name");
		writer.writeLine("iv_source_name = iv_source_name");
		writer.writeLine("it_key_tab = it_key_tab");
		writer.writeLine("it_navigation_path = it_navigation_path");
		writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
		writer.writeLine("er_entity = er_entity");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~get_entity",
			isRedefinition: true,
			code: code
		});
	}

	protected _handleUpdateEntity(){
		let writer = new CodeWriter();
		writer.writeLine(`" TODO: Write Type MPC Type Def`).writeLine();
		writer.writeLine("DATA(entityset_name) = io_tech_request_context->get_entity_set_name( ).");
		writer.writeLine("DATA empty_entity type ref to data.");

		writer.writeLine("CASE entityset_name.").increaseIndent();
		
		for(let entity of [{}]){
			let entityName = "TEST";
			writer.writeLine(`WHEN '${entityName}'.`).increaseIndent();
			writer.writeLine(`data(${entityName}_update_entity) = me->${entityName}_update_entity(`).increaseIndent();
			writer.writeLine(`entity_name = iv_entity_name`);
			writer.writeLine(`entityset_name = iv_entity_set_name`);
			writer.writeLine(`source_name = iv_source_name`);
			writer.writeLine(`data_provider = io_data_provider`);
			writer.writeLine(`key_tab = it_key_tab`);
			writer.writeLine(`navigation_path = it_navigation_path`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent();
			writer.writeLine(`).`);

			writer.writeLine();
			writer.writeLine(`IF ${entityName}_update_entity is initial.`).increaseIndent();
			writer.writeLine(`er_entity = empty_entity.`);
			writer.writeLine(`break.`)
			writer.decreaseIndent().writeLine(`ENDIF.`);
			
			writer.writeLine();
			writer.writeLine(`me->copy_data_to_ref(`).increaseIndent();
			writer.writeLine(`EXPORTING`).increaseIndent();
			writer.writeLine(`is_data = ${entityName}_update_entity`);
			writer.decreaseIndent().writeLine("CHANGING").increaseIndent();
			writer.writeLine(`cr_data = er_entity`).decreaseIndent();
			writer.decreaseIndent().writeLine(`).`).writeLine();

			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~update_entity(").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine("iv_entity_name = iv_entity_name");
		writer.writeLine("iv_entity_set_name = iv_entity_set_name");
		writer.writeLine("iv_source_name = iv_source_name");
		writer.writeLine("io_data_provider = io_data_provider");
		writer.writeLine("it_key_tab = it_key_tab");
		writer.writeLine("it_navigation_path = it_navigation_path");
		writer.writeLine("io_tech_request_context = io_tech_request_context");
		writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
		writer.writeLine("er_entity = er_entity");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~update_entity",
			isRedefinition: true,
			code: code
		});
	}

	protected _handleCreateEntity(){

		let writer = new CodeWriter();
		writer.writeLine(`" TODO: Write Type MPC Type Def`).writeLine();
		writer.writeLine("DATA(entityset_name) = io_tech_request_context->get_entity_set_name( ).");

		writer.writeLine("CASE entityset_name.").increaseIndent();
		
		for(let entity of [{}]){
			let entityName = "TEST";
			writer.writeLine(`WHEN '${entityName}'.`).increaseIndent();
			writer.writeLine(`data(${entityName}_create_entity) = me->${entityName}_create_entity(`).increaseIndent();
			writer.writeLine(`entity_name = iv_entity_name`);
			writer.writeLine(`entity_set_name = iv_entity_set_name`);
			writer.writeLine(`source_name = iv_source_name`);
			writer.writeLine(`data_provider = io_data_provider`);
			writer.writeLine(`key_tab = it_key_tab`);
			writer.writeLine(`navigation_path = it_navigation_path`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent().writeLine(`).`).writeLine();
			writer.writeLine(`me->copy_data_to_ref(`).increaseIndent();
			writer.writeLine(`EXPORTING`).increaseIndent();
			writer.writeLine(`is_data = ${entityName}_create_entity`);
			writer.decreaseIndent().writeLine("CHANGING").increaseIndent();
			writer.writeLine(`cr_data = er_entity`).decreaseIndent();
			writer.decreaseIndent().writeLine(`).`).writeLine();
			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~create_entity(").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine("iv_entity_name = iv_entity_name");
		writer.writeLine("iv_source_name = iv_source_name");
		writer.writeLine("io_data_provider = io_data_provider");
		writer.writeLine("it_key_tab = it_key_tab");
		writer.writeLine("it_navigation_path = it_navigation_path");
		writer.decreaseIndent().writeLine("IMPORTING").increaseIndent();
		writer.writeLine("er_entity = er_entity");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~create_entity",
			isRedefinition: true,
			code: code
		});
	}

	protected _handleDeleteEntity(){
		let writer = new CodeWriter();
		writer.writeLine(`" TODO: Write Type MPC Type Def`).writeLine();
		writer.writeLine("DATA(entityset_name) = io_tech_request_context->get_entity_set_name( ).");

		writer.writeLine("CASE entityset_name.").increaseIndent();
		
		for(let entity of [{}]){
			let entityName = "TEST";
			writer.writeLine(`WHEN '${entityName}'.`).increaseIndent();
			writer.writeLine(`me->${entityName}_delete_entity(`).increaseIndent();
			writer.writeLine(`entity_name = iv_entity_name`);
			writer.writeLine(`entity_set_name = iv_entity_set_name`);
			writer.writeLine(`source_name = iv_source_name`);
			writer.writeLine(`key_tab = it_key_tab`);
			writer.writeLine(`navigation_path = it_navigation_path`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent().writeLine(`).`).writeLine();
			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~delete_entity(").increaseIndent();
		writer.writeLine("iv_entity_name = iv_entity_name");
		writer.writeLine("iv_entity_set_name = iv_entity_set_name");
		writer.writeLine("iv_source_name = iv_source_name")
		writer.writeLine("iv_key_tab = iv_key_tab")
		writer.writeLine("iv_navigation_path = iv_navigation_path")
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~delete_entity",
			isRedefinition: true,
			code: code
		});
	}

	protected _handleActions(actions?: any){
		let getActionName = (action: any, actionKey: string): string => {
			if(action?.["@segw.name"]){
				return action?.["@segw.name"];
			}
			return actionKey;
		}

		Object.keys(actions)?.forEach((actionKey: any) => {
			let action = actions[actionKey];

			let actionName = getActionName(action, actionKey).replace(/\./g, '_');

			this._class?.protectedSection?.methods?.push({
				type: ABAPMethodType.MEMBER,
				name: `execute_${actionName}`,
				importing: [
					{ name: "action_name", 	referenceType: ABAPParameterReferenceType.TYPE, type: "string", isOptional: true },
					{ name: "parameters", 	referenceType: ABAPParameterReferenceType.TYPE, type: "/iwbep/it_mgw_name_value_pair", isOptional: true },
				],
				raising: [
					"/iwbep/cx_mgw_busi_exception",
					"/iwbep/cx_mgw_tech_exception"
				],
				code: [
					"RAISE EXCEPTION TYPE /iwbep/cx_mgw_not_impl_exc",
					"\tEXPORTING",
					"\t\ttextit = /iwbep/cx_mgw_not_impl_exc=>method_not_implemented",
					`\t\tmethod = 'execute_${actionName}'.`
				]
			});
		});

		let writer = new CodeWriter();
		writer.writeLine("CASE iv_action_name.").increaseIndent();
		
		for(let actionKey of Object.keys(actions)){
			let action = actions[actionKey];
			let actionName = getActionName(action, actionKey).replace(/\./g, '_');

			writer.writeLine(`WHEN '${getActionName(action, actionKey)}'.`).increaseIndent();
			writer.writeLine(`data(func_${actionName}) = me->execute_${actionName}(`).increaseIndent();
			writer.writeLine(`action_name = '${getActionName(action, actionKey)}'`);
			writer.writeLine(`parameters = it_parameter`);
			writer.writeLine(`tech_request_context = io_tech_request_context`);
			writer.decreaseIndent().writeLine(`).`).writeLine();
			writer.writeLine(`me->copy_data_to_ref(`).increaseIndent();
			writer.writeLine(`EXPORTING`).increaseIndent();
			writer.writeLine(`is_data = func_${actionName}`);
			writer.decreaseIndent().writeLine("CHANGING").increaseIndent();
			writer.writeLine(`cr_data = er_entity`).decreaseIndent();
			writer.decreaseIndent().writeLine(`).`).writeLine();
			writer.decreaseIndent();
		}
		
		writer.writeLine("when others.").increaseIndent();
		writer.writeLine("super->/iwbep/if_mgw_appl_srv_runtime~execute_action(").increaseIndent();
		writer.writeLine("iv_action_name = iv_action_name");
		writer.writeLine("it_parameter = it_parameter");
		writer.writeLine("io_tech_request_context = io_tech_request_context");
		writer.decreaseIndent().writeLine(").");
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~execute_action",
			isRedefinition: true,
			code: code
		});
	}
}