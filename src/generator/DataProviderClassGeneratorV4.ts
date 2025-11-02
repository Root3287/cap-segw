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

	public _handleCRUDQ(method: Method, entities: any){
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

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		this._handleCRUDQ(Method.LIST, service?.entities ?? []);
		this._handleCRUDQ(Method.CREATE, service?.entities ?? []);
		this._handleCRUDQ(Method.READ, service?.entities ?? []);
		this._handleCRUDQ(Method.UPDATE, service?.entities ?? []);
		this._handleCRUDQ(Method.DELETE, service?.entities ?? []);

		generator.setABAPClass(this._class);
		return generator.generate();
	}
}