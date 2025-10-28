import IFCodeGenerator from "./IFCodeGenerator";
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

import cds, { entity } from "@sap/cds";

const LOG = cds.log("segw");

export default class DataProviderClassGeneratorV2 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: ["/iwbep/cl_mgw_push_abs_data"],
		interfaces: [],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
			structures: [],
			tables: [],
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

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);

		this._handleGetEntitySet();
		this._handleGetEntity();
		this._handleUpdateEntity();
		this._handleCreateEntity();
		this._handleDeleteEntity();

		return generator.generate();
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public setClassName(name: string): void { this._class.name = name; }

	public addEntity(entity: entity): void {
		let splitNamespace = entity.name.split(".");
		let entityName = (<any>entity)?.["@segw.name"] ?? splitNamespace[splitNamespace.length-1];
		let entityReturnType = `ZCL_MPC=>T_${entityName}`;
		
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
		let methodName = `${entityName}_delete_entity`;
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
		let methodName = `${entityName}_delete_entity`;
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
		let methodName = `${entityName}_delete_entity`;
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
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~get_entity_set",
			isRedefinition: true
		});
	}

	protected _handleGetEntity(){ 
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~get_entity",
			isRedefinition: true
		});
	}

	protected _handleUpdateEntity(){ 
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~update_entity",
			isRedefinition: true
		});
	}

	protected _handleCreateEntity(){ 
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~create_entity",
			isRedefinition: true
		});
	}

	protected _handleDeleteEntity(){ 
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_mgw_appl_srv_runtime~delete_entity",
			isRedefinition: true
		});
	}
}