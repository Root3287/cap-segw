import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import cds from "@sap/cds";

const LOG = cds.log("segw");

export default class OperationMPCV4Writer implements IFCodeGenerator {

	private _operations: any[] = [];

	public addOperation(operation: any){
		this._operations.push(operation);
	}

	private _getOperationName(operation: any) {
		if(operation?.["@segw.name"]){
			return operation?.["@segw.name"];
		}
		return operation.name;
	}

	private _getPrimitivePrefix(operation: any): string {
		let actionABAPName = ABAPUtils.getABAPName((<any>operation)?.["@segw.abap.name"] ?? this._getOperationName(operation)).replace(/\./g, '_');
		
		let primitivePrefix = "";
		if(operation?.kind === "function"){
			primitivePrefix = "FUNC";
		}
		if(operation?.kind === "action"){
			primitivePrefix = "ACT";
		}
		primitivePrefix += `_${actionABAPName.toUpperCase()}_`;
		return primitivePrefix;
	}

	private _writeHeader(writer: CodeWriter){
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
	}

	private _writeImportOrBound(writer: CodeWriter, operation: any){
		let operationName = ABAPUtils.getABAPName(this._getOperationName(operation));
		let actionABAPName = ABAPUtils.getABAPName((<any>operation)?.["@segw.abap.name"] ?? this._getOperationName(operation)).replace(/\./g, '_');

		if(!operation?.parent){
			writer.writeLine(`${operation.kind}_import = ${operation.kind}->create_${operation.kind}_import( |${actionABAPName.toUpperCase()}| ).`);
			writer.writeLine(`${operation.kind}_import->set_edm_name( '${operationName}' ).`);
		}else{
			writer.writeLine(`${operation.kind}_parameter = ${operation.kind}->create_parameter( 'PARENT' ).`);
			writer.writeLine(`${operation.kind}_parameter->set_is_binding_parameter( ).`);
			writer.writeLine(`${operation.kind}_parameter->set_entity_type( '${ABAPUtils.getABAPName(operation.parent).toUpperCase()}' ).`);
		}
		writer.writeLine();
	}

	private _writeParams(writer: CodeWriter, operation: any): void {
		for(let param of (operation?.params ?? [])) {

			let paramPrototype = Object.getPrototypeOf(param);
			let primitive = CDSUtils.cds2edm(param.type);
			let primitivePrefix = this._getPrimitivePrefix(operation);

			// Skip Complex type for now...
			if(paramPrototype?.kind === "type") continue;

			writer.writeLine(`${operation.kind}_parameter = ${operation.kind}->create_parameter( '${param.name.toUpperCase()}' ).`);
			if(primitive){
				let paramName = `${primitivePrefix}${ABAPUtils.getABAPName(param).toUpperCase()}`;
				if(paramName.length > 30) LOG.warn(`${paramName} is too long consider shortening with "@segw.abap.name".`);

				writer.writeLine(`primitive = model->create_primitive_type( |${paramName}| ).`);
				writer.writeLine(`primitive->set_edm_type( '${primitive.substr(4)}' ).`);
				writer.writeLine(`${operation.kind}_parameter->set_primitive_type( '${paramName}' ).`);
			}else if(paramPrototype?.kind === "entity"){
				writer.writeLine(`${operation.kind}_parameter->set_entity_type( '${ABAPUtils.getABAPName(paramPrototype).toUpperCase()}' ).`);
			}else if(paramPrototype?.kind === "type"){
				// TODO: Flatten Complex Param
			}
		}

		writer.writeLine();
	}

	private _writeReturn(writer: CodeWriter, operation: any): void {
		let primitivePrefix = this._getPrimitivePrefix(operation);
		// TODO: Collection of Complex Type are not supported

		writer.writeLine(`${operation.kind}_return = ${operation.kind}->create_return( ).`);
		if(!operation?.returns){
			writer.writeLine(`${operation.kind}_return->set_is_nullable( ).`);
		}else{
			let returnEntity = Object.getPrototypeOf(("items" in operation?.returns) ? operation.returns.items : operation.returns);
			let returnPrimative = CDSUtils.cds2edm(operation.returns.type);
			let returnPrimativeName = `${primitivePrefix}R`;

			if("items" in operation?.returns){
				writer.writeLine(`${operation.kind}_return->set_is_collection( ).`);
			}

			if(returnPrimative){
				if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
				writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
				writer.writeLine(`primitive->set_edm_type( '${returnPrimative.substr(4)}' ).`);
				writer.writeLine(`${operation.kind}_return->set_primitive_type( '${returnPrimativeName}' ).`);
			}else if(returnEntity?.kind === "type"){
				if(returnPrimativeName.length > 30) LOG.warn(`${returnPrimativeName} is too long consider shortening with "@segw.abap.name".`);
				writer.writeLine(`primitive = model->create_primitive_type( |${returnPrimativeName}| ).`);
				writer.writeLine(`primitive->set_edm_type( 'String' ).`);
				writer.writeLine(`${operation.kind}_return->set_primitive_type( '${returnPrimativeName}' ).`);
				// writer.writeLine(`${operation.kind}_return->set_complex_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
			}else if(returnEntity?.kind === "entity"){
				let returnEntityName = ABAPUtils.getABAPName(returnEntity).toUpperCase();
				writer.writeLine(`${operation.kind}_return->set_entity_type( '${returnEntityName}' ).`);
				if(!operation?.parent)
					writer.writeLine(`${operation.kind}_import->set_entity_set_name( '${returnEntityName}_SET' ).`);
			}
		}
		writer.writeLine();
	}

	public generate(): string {
		let writer = new CodeWriter();

		this._writeHeader(writer);

		for(let operation of this._operations){
			// Functions must have a return type
			if(operation.kind === "function" && !operation?.returns) LOG.warn(`Function ${operation.name} must have a return type!`);

			// Function Imports must have an entity set
			if(operation.kind === "function" && !operation?.parent && Object.getPrototypeOf(operation?.returns?.items ?? operation?.returns)?.kind !== "entity" )
				LOG.warn(`Function Import ${operation.name} must be an entity!`);

			// Neteeaver 7.50 Does not support Collection of Complex Types
			if(operation?.returns?.items && Object.getPrototypeOf(operation?.returns?.items) === "type")
				LOG.warn(`Collection of Complex Types are not supported in operation ${operation.name}`);
			
			// Netweaver 7.50 Only support returning Entity Types for bounded operations
			if(operation?.parent && operation?.returns && Object.getPrototypeOf(operation?.returns?.items ?? operation?.returns)?.kind !== "entity")
				LOG.warn(`Bounded Operations ${operation.name} only support returning Entity Types`);
			
			// TODO: This could be re-written as the following ABAP
			// try.
			// 	operation = model->get_action( |${operationName| ).
			// catch /iwbep/cx_gateway.
			// 	operation = model->create_action( |${operationName}| ).
			// endtry.
			writer.writeLine(`${operation.kind} = model->create_${operation.kind}( |${operation.toUpperCase()}| ).`);
			
			this._writeParams(writer, operation);
			this._writeReturn(writer, operation);
		}

		return writer.generate();
	}
}