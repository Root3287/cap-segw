import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import * as ABAP from "../types/abap";
import { Class as ABAPClass, ClassSectionType as ABAPClassSectionType} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import { ABAP as ABAPUtils } from "../utils/ABAP";

import cds, { entity, struct } from "@sap/cds";

import CodeWriter from "./CodeWriter";

const LOG = cds.log("segw");

enum Method {
	LIST = 'list',
	READ = 'read',
	CREATE = 'create',
	UPDATE = 'update',
	DELETE = 'delete',
}

export default class DataProviderClassGeneratorV4 implements IFServiceClassGenerator {
	private _class: ABAP.Class = {
		name: "",
		inheriting: ["/iwbep/cl_v4_abs_data_provider"],
		publicSection: {
			type: ABAP.ClassSectionType.PUBLIC,
			types: [],
			methods: {},
		},
		protectedSection: {
			type: ABAP.ClassSectionType.PROTECTED,
			methods: {},
		},
		privateSection: {
			type: ABAP.ClassSectionType.PRIVATE,
			methods: {},
		},  
	};

	private _compilerInfo?: CompilerInfo;

	public constructor(){}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public getFileName(): string { 
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		if(!service) return `ZCL_${ABAPUtils.getABAPName(namespace)}_DPC.abap`;
		if((<any>service)?.["@segw.name"]) return `ZCL_${(<any>service)?.["@segw.name"]}_DPC.abap`;
		return `ZCL_${ABAPUtils.getABAPName(service.name.split('.').at(-1))}_DPC.abap`;
	}

	public addEntity(entity: entity): void {
		this._entityCRUDQAction(Method.LIST, entity);
		this._entityCRUDQAction(Method.CREATE, entity);
		this._entityCRUDQAction(Method.READ, entity);
		this._entityCRUDQAction(Method.UPDATE, entity);
		this._entityCRUDQAction(Method.DELETE, entity);
		
		Object.keys(entity?.actions ?? {}).forEach((actionKey) => {
			let action = entity?.actions[actionKey];
			if(action?.kind === "action") this._action(action);
			if(action?.kind === "function") this._function(action);
		});

		this._entityHandleTargetRef(entity);
		this._entityHandleTargetRefList(entity);
	};

	private _getOperationName(action: any): string {
		let methodName = "execute";
		if(action?.parent){
			methodName += `_${ABAPUtils.getABAPName(action.parent)}`;
		}
		methodName += `_${ABAPUtils.getABAPName(action)}`;
		methodName = action?.["@segw.name"] ?? methodName;
		return methodName;
	}

	private _entityCRUDQAction(method: Method, entity: entity){
		let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');
		let methodName = `${entityName}_${method}`;
		if(methodName.length > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with '@segw.name'.`);
		}
		// methodName = (<any>entity)?.["@segw.name"] ?? methodName;
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_${method}` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_${method}` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				`data todo_list type /iwbep/if_v4_requ_basic_${method}=>ty_s_todo_list.`,
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				`data done_list type /iwbep/if_v4_requ_basic_${method}=>ty_s_todo_process_list.`,
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _action(action: any){
		let methodName = this._getOperationName(action);
		if(methodName.length > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with '@segw.name'.`);
		}
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_action` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_action` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				"data todo_list type /iwbep/if_v4_requ_basic_action=>ty_s_todo_list.",
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				"data done_list type /iwbep/if_v4_requ_basic_action=>ty_s_todo_process_list.",
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _function(action: any){
		let methodName = this._getOperationName(action);
		if(methodName.length > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with '@segw.name'.`);
		}
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_func` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_func` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				"data todo_list type /iwbep/if_v4_requ_basic_func=>ty_s_todo_list.",
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				"data done_list type /iwbep/if_v4_requ_basic_func=>ty_s_todo_process_list.",
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _entityHandleTargetRef(entity: entity){
		let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');
		let methodName = (<any>entity)?.["@segw.target_ref.method"] ?? `${entityName}_target_ref`;
		if(methodName.length > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with '@segw.name' or '@segw.target_ref.method'`);
		}
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_ref_r` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_ref_r` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				"data todo_list type /iwbep/if_v4_requ_basic_ref_r=>ty_s_todo_list.",
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				"data done_list type /iwbep/if_v4_requ_basic_ref_r=>ty_s_todo_process_list.",
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _entityHandleTargetRefList(entity: entity){
		let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');
		let methodName = (<any>entity)?.["@segw.target_ref_list.method"] ?? `${entityName}_target_ref_l`;
		if(methodName.length > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with '@segw.name' or '@segw.target_ref_list.method'`);
		}
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_ref_l` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_ref_l` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				"data todo_list type /iwbep/if_v4_requ_basic_ref_l=>ty_s_todo_list.",
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				"data done_list type /iwbep/if_v4_requ_basic_ref_l=>ty_s_todo_process_list.",
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _handleCRUDQ(method: Method, entities: any){
		let methodName = `${method}_entity`;
		if(method === Method.LIST) methodName = `read_entity_list`;
		let writer = new CodeWriter();
		writer.writeLine("data entityset_name type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_entity_set( importing ev_entity_set_name = entityset_name ).");
		writer.writeLine();
		writer.writeLine("CASE entityset_name.").increaseIndent();
		for(let entity of entities ?? []){
			let entityName = ABAPUtils.getABAPName(entity);
			let entityNameInternal = entityName.replace(/\./, '_');
			let entitySetName = (<any>entity)?.["@segw.set.name"] ?? `${entityNameInternal.toUpperCase()}`;
			let methodName = `${entityNameInternal}_${method}`;

			writer.writeLine(`WHEN '${entitySetName}'.`).increaseIndent();
			writer.writeLine(`me->${methodName}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}
		writer.writeLine("WHEN OTHERS.").increaseIndent();
		writer.writeLine(`super->/iwbep/if_v4_dp_basic~${methodName}(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");
		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~${methodName}`] = {
			type: ABAP.MethodType.MEMBER,
			isRedefinition: true,
			code: code
		};
	}

	private _handleActions(service: any): void {
		let writer = new CodeWriter();
		writer.writeLine("data action type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine("data action_import type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_action( importing ev_action_name = action ).");
		writer.writeLine("io_request->get_action_import( importing ev_action_import_name = action_import ).");
		writer.writeLine();
		
		let writeHandleAction = (actionName: string, action: any) => {
			let internalABAPName = action?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(action).replace(/\./,'_').toUpperCase();
			writer.writeLine(`WHEN '${internalABAPName}'.`).increaseIndent();
			writer.writeLine(`me->${actionName}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}

		let handleOthers = () => {
			writer.writeLine("WHEN OTHERS.").increaseIndent();
			writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_action(`).increaseIndent();
			writer.writeLine(`io_request = io_request`)
			writer.writeLine(`io_response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent();
		};

		writer.writeLine("IF action_import IS NOT INITIAL.").increaseIndent();
		writer.writeLine("CASE action_import.").increaseIndent();
		for(let action of service?.actions ?? []){
			if(action?.kind === "function") continue;
			let operationName = this._getOperationName(action);
			writeHandleAction(operationName, action);
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine();

		writer.writeLine("IF action is not initial.").increaseIndent();
		writer.writeLine("CASE action.").increaseIndent();
		for(let entity of service?.entities ?? []){
			for(let action of (entity?.actions ?? [])){
				if(action?.kind === "function") continue;
				let methodName = this._getOperationName(action)
				writeHandleAction(methodName, action);
			}
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_action(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);

		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~execute_action`] = {
			type: ABAP.MethodType.MEMBER,
			code: code,
			isRedefinition: true
		};
	}

	private _handleFunctions(service: any): void {
		let writer = new CodeWriter();

		writer.writeLine("data function type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine("data function_import type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_function( importing ev_function_name = function ).");
		writer.writeLine("io_request->get_function_import( importing ev_function_import_name = function_import ).");
		writer.writeLine();
		
		let writeHandleAction = (actionName: string, action: any) => {
			let internalABAPName = action?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(action).replace(/\./,'_').toUpperCase();
			writer.writeLine(`WHEN '${internalABAPName}'.`).increaseIndent();
			writer.writeLine(`me->${actionName}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}

		let handleOthers = () => {
			writer.writeLine("WHEN OTHERS.").increaseIndent();
			writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_function(`).increaseIndent();
			writer.writeLine(`io_request = io_request`)
			writer.writeLine(`io_response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent();
		};

		writer.writeLine("IF function_import IS NOT INITIAL.").increaseIndent();
		writer.writeLine("CASE function_import.").increaseIndent();
		for(let action of service?.actions ?? []){
			if(action?.kind === "action") continue;
			let methodName = this._getOperationName(action);
			writeHandleAction(methodName, action);
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine();

		writer.writeLine("IF function is not initial.").increaseIndent();
		writer.writeLine("CASE function.").increaseIndent();
		for(let entity of service?.entities ?? []){
			for(let action of (entity?.actions ?? [])){
				if(action?.kind === "action") continue;
				let methodName = this._getOperationName(action);
				writeHandleAction(methodName, action);
			}
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_function(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);

		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~execute_function`] = {
			type: ABAP.MethodType.MEMBER,
			code: code,
			isRedefinition: true
		};
	}

	private _handleRefTargetKeyData(service: any){
		let writer = new CodeWriter();

		writer.writeLine("data source_entity_type type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_source_entity_type( importing ev_source_entity_type_name = source_entity_type ).");
		writer.writeLine();

		let writeHandleRef = (methodName: string, entity: any) => {
			let internalABAPName = entity?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(entity).replace(/\./,'_').toUpperCase();
			writer.writeLine(`WHEN '${internalABAPName}'.`).increaseIndent();
			writer.writeLine(`me->${methodName}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}

		let handleOthers = () => {
			writer.writeLine(`super->/iwbep/if_v4_dp_basic~read_ref_target_key_data(`).increaseIndent();
			writer.writeLine(`io_request = io_request`)
			writer.writeLine(`io_response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
		};

		writer.writeLine("CASE source_entity_type.").increaseIndent();
		for(let entity of service?.entities ?? []){
			let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');
			let methodName = (<any>entity)?.["@segw.target_ref.method"] ?? `${entityName}_target_ref`;
			writeHandleRef(methodName, entity);
		}
		writer.writeLine("WHEN OTHERS.").increaseIndent();
		handleOthers();
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~read_ref_target_key_data`] = {
			type: ABAP.MethodType.MEMBER,
			code: code,
			isRedefinition: true
		};
	}

	private _handleRefTargetKeyDataList(service: any){
		let writer = new CodeWriter();

		writer.writeLine("data source_entity_type type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_source_entity_type( importing ev_source_entity_type_name = source_entity_type ).");
		writer.writeLine();

		let writeHandleRef = (methodName: string, entity: any) => {
			let internalABAPName = entity?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(entity).replace(/\./,'_').toUpperCase();
			writer.writeLine(`WHEN '${internalABAPName}'.`).increaseIndent();
			writer.writeLine(`me->${methodName}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}

		let handleOthers = () => {
			writer.writeLine(`super->/iwbep/if_v4_dp_basic~read_ref_target_key_data_list(`).increaseIndent();
			writer.writeLine(`io_request = io_request`)
			writer.writeLine(`io_response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
		};

		writer.writeLine("CASE source_entity_type.").increaseIndent();
		for(let entity of service?.entities ?? []){
			let entityName = ABAPUtils.getABAPName(entity).replace(/\./g, '_');
			let methodName = (<any>entity)?.["@segw.target_ref_list.method"] ?? `${entityName}_target_ref_l`;
			writeHandleRef(methodName, entity);
		}
		writer.writeLine("WHEN OTHERS.").increaseIndent();
		handleOthers();
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");

		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~read_ref_target_key_data_list`] = {
			type: ABAP.MethodType.MEMBER,
			code: code,
			isRedefinition: true
		};
	}

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		for(const action of (service?.actions ?? [])){
			if(action?.kind === "action") this._action(action);
			if(action?.kind === "function") this._function(action);
		}

		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		this._handleCRUDQ(Method.LIST, service?.entities ?? []);
		this._handleCRUDQ(Method.CREATE, service?.entities ?? []);
		this._handleCRUDQ(Method.READ, service?.entities ?? []);
		this._handleCRUDQ(Method.UPDATE, service?.entities ?? []);
		this._handleCRUDQ(Method.DELETE, service?.entities ?? []);
		
		this._handleActions(service);
		this._handleFunctions(service);
		this._handleRefTargetKeyData(service);
		this._handleRefTargetKeyDataList(service);

		generator.setABAPClass(this._class);
		return generator.generate();
	}
}