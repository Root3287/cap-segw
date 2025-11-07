import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { CompilerInfo } from "../types/frontend";
import { Primitive as EDMPrimitive } from "../types/edm";

import cds from "@sap/cds";

const LOG = cds.log("segw");

type Operation = {
	csn: any;
	csdl: any;
	abap_name: string;
	name: string;
}

export default class OperationMPCV4CSDLWriter implements IFCodeGenerator {

	private _compilerInfo?: CompilerInfo;
	private _writer: CodeWriter = new CodeWriter();

	public setCompilerInfo(compilerInfo?: CompilerInfo){
		this._compilerInfo = compilerInfo;
	}

	private _getOperationName(operation: any) {
		if(operation?.["@segw.name"]){
			return operation?.["@segw.name"];
		}
		return operation.name;
	}

	private _getPrimitivePrefix(operation: Operation): string {
		let primitivePrefix = "";
		if(operation.csdl?.["$Kind"] === "Function"){
			primitivePrefix = "FUNC";
		}
		if(operation.csdl?.["$Kind"] === "Action"){
			primitivePrefix = "ACT";
		}
		primitivePrefix += `_${operation.abap_name.toUpperCase()}_`;
		return primitivePrefix;
	}

	private _getCDSOperation(name: string, operation: any): any {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn?.services?.[namespace];

		let csnOperationPath = (operation?.["$IsBound"]) ? [
			"entities",
			...operation?.["$Parameter"]?.[0]?.["$Type"].split('.').slice(1),
			"actions",
			name
		] : ["actions", name];
		return csnOperationPath.reduce((acc: any, curr: any) => acc?.[curr], service);
	}

	private _writeHeader(){
		this._writer.writeLine("data primitive type ref to /iwbep/if_v4_med_prim_type.");
		this._writer.writeLine("data action type ref to /iwbep/if_v4_med_action.");
		this._writer.writeLine("data action_import type ref to /iwbep/if_v4_med_action_imp.");
		this._writer.writeLine("data action_parameter type ref to /iwbep/if_v4_med_act_param.");
		this._writer.writeLine("data action_return type ref to /iwbep/if_v4_med_act_return.");
		this._writer.writeLine();
		this._writer.writeLine("data function type ref to /iwbep/if_v4_med_function.");
		this._writer.writeLine("data function_import type ref to /iwbep/if_v4_med_func_imp.");
		this._writer.writeLine("data function_parameter type ref to /iwbep/if_v4_med_func_param.");
		this._writer.writeLine("data function_return type ref to /iwbep/if_v4_med_func_return.");
		this._writer.writeLine();
	}

	private _writeImportOrBound(operation: Operation){
		// let operation.name = ABAPUtils.getABAPName(this._getoperation.name(operation));
		if(operation.csdl?.["$IsBound"]) return;
		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_import = ${operation.csdl?.["$Kind"].toLowerCase()}->create_${operation.csdl?.["$Kind"].toLowerCase()}_import( |${operation.abap_name.toUpperCase()}| ).`);
		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_import->set_edm_name( '${operation.name}' ).`);
		this._writer.writeLine();
	}

	private _writeParams(operation: Operation): void {
		let primitivePrefix = this._getPrimitivePrefix(operation);
		let index = 0;
		for(let param of (operation.csdl?.["$Parameter"] ?? [])) {
			param["$Type"] ??= EDMPrimitive.String;
			let paramType = (param?.["$Type"].startsWith("Edm")) ? param?.["$Type"] : 
			param?.["$Type"].split(".").reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csdl);

			// Skip Complex type for now...
			if(paramType?.["$Kind"] === "ComplexType") continue;

			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter = ${operation.csdl?.["$Kind"].toLowerCase()}->create_parameter( '${param?.["$Name"].toUpperCase()}' ).`);
			if(param?.["$Type"].startsWith("Edm")){
				let paramNameInternal = `${primitivePrefix}${ABAPUtils.getABAPName(param?.["$Name"]).toUpperCase()}`;
				if(paramNameInternal.length > 30) LOG.warn(`${paramNameInternal} is too long consider shortening with "@segw.abap.name".`);

				this._writer.writeLine(`primitive = model->create_primitive_type( |${paramNameInternal}| ).`);
				this._writer.writeLine(`primitive->set_edm_type( '${param?.["$Type"].substring(4)}' ).`);
				this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter->set_primitive_type( '${param?.["$Type"].substr(4)}' ).`);
			}else if(paramType?.["$Kind"] === "EntityType"){
				let entity = operation.csn.params?.[param?.["$Name"]];
				if(operation.csdl["$IsBound"] && index === 0){
					this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter->set_is_binding_parameter( ).`);
					entity = operation.csn?.parent;
				}
				this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter->set_entity_type( '${ABAPUtils.getABAPName(entity).toUpperCase()}' ).`);
			}else if(paramType?.["$Kind"] === "ComplexType"){
				// TODO: Flatten Complex Param
			}
			index++;
		}

		this._writer.writeLine();
	}

	private _writeReturn(operation: Operation): void {
		let primitivePrefix = this._getPrimitivePrefix(operation);
		// TODO: Collection of Complex Type are not supported

		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return = ${operation.csdl?.["$Kind"].toLowerCase()}->create_return( ).`);
		if(!operation.csdl?.returns){
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_is_nullable( ).`);
			return;
		}

		operation.csdl["$ReturnType"]["$Type"] ??= EDMPrimitive.String;
		let returnEntity = (operation.csdl["$ReturnType"]["$Type"].startsWith("Edm")) ? operation.csdl["$ReturnType"]["$Type"] :
			operation.csdl["$ReturnType"]["$Type"].split(".").reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csdl);
		let returnPrimativeName = `${primitivePrefix}R`;

		if(operation.csdl?.["$ReturnType"]?.["$Collection"]){
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_is_collection( ).`);
		}

		if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
		if(operation.csdl["$ReturnType"]["$Type"].startsWith("Edm")){
			this._writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
			this._writer.writeLine(`primitive->set_edm_type( '${operation.csdl["$ReturnType"]["$Type"].substr(4)}' ).`);
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_primitive_type( '${operation.csdl["$ReturnType"]["$Type"]}' ).`);
		}else if(returnEntity["$Kind"] === "ComplexType"){
			// this._writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
			// this._writer.writeLine(`primitive->set_edm_type( 'String' ).`);
			// this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()}_return->set_primitive_type( '${returnPrimativeName}' ).`);
			// this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()}_return->set_complex_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
		}else if(returnEntity["$Kind"] === "EntityType"){
			let returnEntityName = ABAPUtils.getABAPName(operation.csdl["$ReturnType"]["$Type"].split('.').at(-1)).toUpperCase();
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_entity_type( '${returnEntityName}' ).`);
			if(!operation.csdl?.["$IsBound"])
				this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_import->set_entity_set_name( '${returnEntityName}_SET' ).`);
		}
		this._writer.writeLine();
	}

	public generate(): string {
		this._writer = new CodeWriter();

		this._writeHeader();

		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		let operations = Object.entries(this._compilerInfo?.csdl[namespace]).filter(([key, value]: any) => {
			if(key.startsWith('$')) return false;
			if(key.startsWith('@')) return false;
			if(key === "EntityContainer") return false;
			if(value?.["$Kind"] === "EntityType") return false;
			if(value?.["$Kind"] === "ComplexType") return false;
			return true;
		});

		for(let [operationName, operationOverloads] of operations){
			for(let operation of (<any>operationOverloads)){
				let operationInfo: Operation = {
					csn: this._getCDSOperation(operationName, operation),
					csdl: operation,
					abap_name: "",
					name: operationName
				};

				operationInfo.abap_name = (<any>operationInfo.csn)?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(operationInfo.csn).replace(/\./g, '_');

				// Functions must have a return type
				if(operation?.["$Kind"] === "Function" && !operation?.["$ReturnType"]) LOG.warn(`Function ${operation.name} must have a return type!`);

				let returnType = operation?.["$ReturnType"]?.["$Type"].split('.').reduce((acc: any, curr: any) => { 
					return acc[curr]; 
				}, this._compilerInfo?.csdl);
				
				// Function Imports must have an entity set
				if(operation?.["$Kind"] === "Function" && !operation?.["$IsBound"] && returnType?.["$Kind"] !== "EntityType" )
					LOG.warn(`Function Import ${operation.name} must be an entity!`);

				// Netweaver 7.50 Does not support Collection of Complex Types
				if(operation?.["$ReturnType"]?.["$Collection"] && returnType?.["$Kind"] === "ComplexType")
					LOG.warn(`Collection of Complex Types are not supported in operation ${operation.name}`);
				
				// Netweaver 7.50 Only support returning Entity Types for bounded operations
				if(operation?.["$IsBound"] && returnType?.["$Kind"] !== "EntityType"  )
					LOG.warn(`Bounded Operations ${operation.name} only support returning Entity Types`);
				
				// TODO: This could be re-written as the following ABAP
				// try.
				// 	operation = model->get_action( |${operation.name| ).
				// catch /iwbep/cx_gateway.
				// 	operation = model->create_action( |${operation.name}| ).
				// endtry.
				this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()} = model->create_${operation?.["$Kind"].toLowerCase()}( |${operationInfo.name.toUpperCase().replace(/\./g, '_')}| ).`);
				
				this._writeImportOrBound(operationInfo);
				this._writeParams(operationInfo);
				this._writeReturn(operationInfo);
				this._writer.writeLine();
			}
		}
		return this._writer.generate();
	}
}