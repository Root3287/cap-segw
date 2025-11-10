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
			...operation?.["$Parameter"]?.[0]?.["$Type"].split('.').slice(namespace.split('.').length),
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
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		// let operation.name = ABAPUtils.getABAPName(this._getoperation.name(operation));
		if(operation.csdl?.["$IsBound"]) return;
		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_import = ${operation.csdl?.["$Kind"].toLowerCase()}->create_${operation.csdl?.["$Kind"].toLowerCase()}_import( |${operation.abap_name.toUpperCase()}| ).`);
		
		// Actions don't need Entity Set
		if(operation.csdl?.["$Kind"] === "Action") {
			this._writer.writeLine();
			return;
		}

		let entitySet = this._compilerInfo?.csdl?.[namespace]?.EntityContainer?.[operation.name]?.["$EntitySet"];
		let entitySetCSN = [
			"services",
			namespace,
			"entities",
			entitySet
		].reduce((arr: any, curr: any)=> arr[curr], this._compilerInfo?.csn);
		let entitySetName = entitySetCSN?.["@segw.set.name"] ?? `${ABAPUtils.getABAPName(entitySetCSN).replace(/\./g, '_').toUpperCase()}_SET`;
		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_import->set_entity_set_name( '${entitySetName}' ).`);
		this._writer.writeLine();
	}

	private _writeParams(operation: Operation): void {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];

		let primitivePrefix = this._getPrimitivePrefix(operation);
		let index = 0;
		for(let param of (operation.csdl?.["$Parameter"] ?? [])) {
			param["$Type"] ??= EDMPrimitive.String;
			let paramType = (param?.["$Type"].startsWith("Edm")) ? param?.["$Type"] : 
				[
					namespace,
					...param?.["$Type"].split(".").splice(namespace.split('.').length)
				].reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csdl);

			// Skip Complex type for now...
			if(!param["$Type"].startsWith("Edm") && paramType?.["$Kind"] === "ComplexType") continue;

			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter = ${operation.csdl?.["$Kind"].toLowerCase()}->create_parameter( '${param?.["$Name"].toUpperCase()}' ).`);
			if(param?.["$Type"].startsWith("Edm")){
				let paramNameInternal = `${primitivePrefix}${ABAPUtils.getABAPName(param?.["$Name"]).toUpperCase()}`;
				if(paramNameInternal.length > 30) LOG.warn(`${paramNameInternal} is too long consider shortening with "@segw.abap.name".`);

				this._writer.writeLine(`primitive = model->create_primitive_type( |${paramNameInternal}| ).`);
				this._writer.writeLine(`primitive->set_edm_type( '${param?.["$Type"].substring(4)}' ).`);
				this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_parameter->set_primitive_type( '${paramNameInternal}' ).`);
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
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		let primitivePrefix = this._getPrimitivePrefix(operation);
		
		// Functions Must have a return type
		if(operation?.csdl?.["$Kind"] === "Function" && !operation?.csdl?.["$ReturnType"]) 
			LOG.warn(`Function ${operation.name} must have a return type!`);
		
		// An Action could return nothing.
		if(operation?.csdl["$Kind"] === "Action" && !operation?.csdl["$ReturnType"]) return;

		this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return = ${operation.csdl?.["$Kind"].toLowerCase()}->create_return( ).`);
		if(!operation.csdl?.["$ReturnType"]["$Nullable"]){
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_is_nullable( ).`);
		}
		
		if(operation.csdl?.["$ReturnType"]?.["$Collection"]){
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_is_collection( ).`);
		}

		operation.csdl["$ReturnType"]["$Type"] ??= EDMPrimitive.String;
		let isPrimitive = operation.csdl["$ReturnType"]["$Type"].startsWith("Edm");
		let returnType = (isPrimitive) ? operation.csdl["$ReturnType"]["$Type"] : 
				[
					namespace,
					...operation.csdl["$ReturnType"]["$Type"].split(".").splice(namespace.split('.').length)
				].reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csdl);

		// Function Import must have an entity set
		if(
			operation?.csdl?.["$Kind"] === "Function" && 
			!operation?.csdl?.["$IsBound"] && 
			returnType?.["$Kind"] !== "EntityType"
		){
			LOG.warn(`Function Import ${operation.name} must be an entity!`);
		}

		// Netweaver 7.50 Does not support Collection of Complex Types
		if(operation?.csdl["$ReturnType"]?.["$Collection"] && !isPrimitive && returnType["$Kind"] === "ComplexType")
			LOG.warn(`Collection of Complex Types are not supported in operation ${operation.name}`);

		// Netweaver 7.50 Only support returning Entity Types for bounded operations
		if(operation?.csdl["$IsBound"] && !isPrimitive && returnType?.["$Kind"] !== "EntityType")
			LOG.warn(`Function Import ${operation.name} must be an entity!`);

		if(isPrimitive){
			let returnPrimativeName = `${primitivePrefix}R`;
			if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
			this._writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
			this._writer.writeLine(`primitive->set_edm_type( '${operation.csdl["$ReturnType"]["$Type"].substr(4)}' ).`);
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_primitive_type( '${operation.csdl["$ReturnType"]["$Type"]}' ).`);
		}else if(returnType["$Kind"] === "ComplexType"){
			// this._writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
			// this._writer.writeLine(`primitive->set_edm_type( 'String' ).`);
			// this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()}_return->set_primitive_type( '${returnPrimativeName}' ).`);
			// this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()}_return->set_complex_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
		}else if(returnType["$Kind"] === "EntityType"){
			let returnEntityCSN = [
				"services",
				namespace,
				"entities",
				operation.csdl["$ReturnType"]["$Type"].split(".").slice(namespace.split('.').length).join('.')
			].reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csn);

			let returnEntityName = ABAPUtils.getABAPName(returnEntityCSN).toUpperCase();
			this._writer.writeLine(`${operation.csdl?.["$Kind"].toLowerCase()}_return->set_entity_type( '${returnEntityName}' ).`);
		}
		this._writer.writeLine();
	}

	public generate(): string {
		this._writer = new CodeWriter();

		this._writeHeader();

		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		let operations = Object.entries(this._compilerInfo?.csdl[namespace]).filter(([key, value]: any) => {
			if(!Array.isArray(value)) return false;
			if(value.length <= 0) return false;
			if(value[0]?.["$Kind"] !== "Function" && value[0]?.["$Kind"] !== "Action") return false;
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

				// TODO: This could be re-written as the following ABAP
				// try.
				// 	operation = model->get_action( |${operation.name| ).
				// catch /iwbep/cx_gateway.
				// 	operation = model->create_action( |${operation.name}| ).
				// endtry.
				this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()} = model->create_${operation?.["$Kind"].toLowerCase()}( |${operationInfo.abap_name.toUpperCase().replace(/\./g, '_')}| ).`);
				this._writer.writeLine(`${operation?.["$Kind"].toLowerCase()}->set_edm_name( |${operationInfo.name.replace(/\./g, '_')}| ).`);
				
				this._writeImportOrBound(operationInfo);
				this._writeParams(operationInfo);
				this._writeReturn(operationInfo);
				this._writer.writeLine();
			}
		}
		return this._writer.generate();
	}
}