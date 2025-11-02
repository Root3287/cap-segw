import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import * as ABAP from "../types/abap";
import { Class as ABAPClass, ClassSectionType as ABAPClassSectionType} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import { ABAP as ABAPUtils } from "../utils/ABAP";

import { entity, struct } from "@sap/cds";

import CodeWriter from "./CodeWriter";


enum Method {
	LIST = 'read_list',
	READ = 'read',
	CREATE = 'create',
	UPDATE = 'update',
	DELETE = 'delete',
}

export default class DataProviderClassGeneratorV4 implements IFServiceClassGenerator {
	private _class: ABAP.Class = {
		name: "",
		interfaces: [],
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
		return `ZCL_${ABAPUtils.getABAPName(service)}_DPC.abap`;
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
	};

	private _entityCRUDQAction(method: Method, entity: entity){
		let entityName = ABAPUtils.getABAPName(entity);
		let methodName = `${entityName}_${method}`;
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_${method}` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_${method}` },
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
		let methodName = "execute";
		if(action?.parent){
			methodName += `_${ABAPUtils.getABAPName(entity)}`;
		}
		methodName += `_${action.name}`;
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_action` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_action` },
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
		let methodName = "execute";
		if(action?.parent){
			methodName += `_${ABAPUtils.getABAPName(entity)}`;
		}
		methodName += `_${action.name}`;
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[methodName] = {
			type: ABAP.MethodType.MEMBER,
			importing: [
				{ name: "request", 	referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_resp_basic_function` },
				{ name: "response", referenceType: ABAP.ParameterReferenceType.TYPE_REF, type: `/iwbep/if_v4_requ_basic_function` },
			],
			raising: [
				"/IWBEP/CX_GATEWAY"
			],
			code: [
				"data todo_list type /iwbep/if_v4_requ_basic_function=>ty_s_todo_list.",
				"request->get_todos( importing es_todo_list = todo_list ).",
				"",
				"data done_list type /iwbep/if_v4_requ_basic_funcion=>ty_s_todo_process_list.",
				"response->set_is_done( done_list ).",
			]
		};
	}

	private _handleCRUDQ(method: Method, entities: any){
		let writer = new CodeWriter();
		writer.writeLine("data entityset_name type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_entity_set( importing ev_entity_set_name = entityset_name ).");
		writer.writeLine();
		writer.writeLine("CASE entityset_name.").increaseIndent();
		for(let entity of entities ?? []){
			let entitySetName = (<any>entity)?.["@segw.set.name"] ?? `${ABAPUtils.getABAPName(entity)}`;
			writer.writeLine(`WHEN ${entitySetName}.`).increaseIndent();
			writer.writeLine(`me->${entitySetName}_${method}(`).increaseIndent();
			writer.writeLine(`request = io_request`);
			writer.writeLine(`response = io_response`);
			writer.decreaseIndent().writeLine(`).`);
			writer.decreaseIndent().writeLine();
		}
		writer.writeLine("WHEN OTHERS.").increaseIndent();
		writer.writeLine(`super->/iwbep/if_v4_dp_basic~${method}_entity(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine("ENDCASE.");
		let code = writer.generate().split('\n');
		this._class.publicSection ??= { type: ABAPClassSectionType.PUBLIC };
		this._class.publicSection.methods ??= {};
		this._class.publicSection.methods[`/iwbep/if_v4_dp_basic~${method}_entity`] = {
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
		writer.writeLine("io_request->get_action( importing ev_action = action ).");
		writer.writeLine("io_request->get_action_import( importing ev_action_import = action_import ).");
		writer.writeLine();
		
		let writeHandleAction = (actionName: string, action: any) => {
			writer.writeLine(`WHEN '${actionName}'.`).increaseIndent();
			writer.writeLine(`me->execute_${actionName.replace(/\./g, '_')}(`).increaseIndent();
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
			writeHandleAction(action.name, action);
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine();

		writer.writeLine("IF action is not initial.").increaseIndent();
		writer.writeLine("CASE action_import.").increaseIndent();
		for(let entity of service?.entities ?? []){
			for(let action of (service?.actions ?? [])){
				if(action?.kind === "function") continue;
				writeHandleAction(`${ABAPUtils.getABAPName(entity)}_${action.name}`, action);
			}
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_action(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);

		let code = writer.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[`/iwbep/if_v4_dp_basic~execute_action`] = {
			type: ABAP.MethodType.MEMBER,
			code: code
		};
	}

	private _handleFunctions(service: any): void {
		let writer = new CodeWriter();

		writer.writeLine("data function type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine("data function_import type /iwbep/if_v4_med_element=>ty_e_med_internal_name.");
		writer.writeLine();
		writer.writeLine("io_request->get_function( importing ev_function = function ).");
		writer.writeLine("io_request->get_function_import( importing ev_function_import = function_import ).");
		writer.writeLine();
		
		let writeHandleAction = (actionName: string, action: any) => {
			writer.writeLine(`WHEN '${actionName}'.`).increaseIndent();
			writer.writeLine(`me->execute_${actionName.replace(/\./g, '_')}(`).increaseIndent();
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

		writer.writeLine("IF action_import IS NOT INITIAL.").increaseIndent();
		writer.writeLine("CASE action_import.").increaseIndent();
		for(let action of service?.actions ?? []){
			if(action?.kind === "function") continue;
			writeHandleAction(action.name, action);
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE.");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine();

		writer.writeLine("IF action is not initial.").increaseIndent();
		writer.writeLine("CASE action_import.").increaseIndent();
		for(let entity of service?.entities ?? []){
			for(let action of (service?.actions ?? [])){
				if(action?.kind === "function") continue;
				writeHandleAction(`${ABAPUtils.getABAPName(entity)}_${action.name}`, action);
			}
		}
		handleOthers();
		writer.decreaseIndent().writeLine("ENDCASE");
		writer.writeLine("return.");
		writer.decreaseIndent().writeLine("ENDIF.");

		writer.writeLine(`super->/iwbep/if_v4_dp_basic~execute_function(`).increaseIndent();
		writer.writeLine(`io_request = io_request`)
		writer.writeLine(`io_response = io_response`);
		writer.decreaseIndent().writeLine(`).`);

		let code = writer.generate().split('\n');
		this._class.protectedSection ??= { type: ABAPClassSectionType.PROTECTED };
		this._class.protectedSection.methods ??= {};
		this._class.protectedSection.methods[`/iwbep/if_v4_dp_basic~execute_function`] = {
			type: ABAP.MethodType.MEMBER,
			code: code
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

		generator.setABAPClass(this._class);
		return generator.generate();
	}
}