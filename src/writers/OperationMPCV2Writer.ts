import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import * as ABAP from "../types/abap";
import { Primitive as CDSPrimitive } from "../types/cds";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import cds from "@sap/cds";

const LOG = cds.log("segw");

export default class OperationMPCV2Writer implements IFCodeGenerator {

	private _className: string = "";
	private _operations: Record<string, any> = {};
	private _types?: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table> = [];

	public setClassName(className: string){
		this._className = className;
	}

	public addOperations(operations: any) {
		Object.assign(this._operations, operations);
	}

	public setOperationsTypes(type?: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>){
		this._types = type;
	}
	
	private _getOperationName(actionName: string, operation: any): string {
		if(operation?.["@segw.name"]){
			return operation?.["@segw.name"];
		}
		return actionName;
	}

	private _writeHeader(writer: CodeWriter){
		writer.writeLine("data action type ref to /iwbep/if_mgw_odata_action.");
		writer.writeLine("data parameter type ref to /iwbep/if_mgw_odata_parameter.");
		writer.writeLine();
	}

	private _writeBounded(writer: CodeWriter, operation: any, operationName: string){
		if(!operation?.parent){ return; }
		writer.writeLine(`action->set_action_for( '${ABAPUtils.getABAPName(operation?.parent)}' ).`).writeLine();
	}

	private _writeParams(writer: CodeWriter, operation: any, operationName: string){
		for(let param of operation?.params ?? []){
			let paramName = (<any>param?.["@segw.name"]) ?? ABAPUtils.getABAPName(param);
			let abapName = (<any>param?.["@segw.abap.name"]) ?? ABAPUtils.getABAPName(param);
			writer.writeLine(`parameter = action->create_input_parameter( iv_paramenter_name = '${paramName}' iv_abap_fieldname = '${abapName}' ).`)
			writer.writeLine(this._getSetEDMTypeString(param, "parameter->/iwbep/if_mgw_odata_property~"));
		}

		if(!operation?.params){ return; }

		let inputType = this?._types?.find((type: any) => { 
			return type?.name === `t_${operationName}_input`;
		});
		if(!inputType){
			LOG.warn(`Could not find type 't_${operationName}_input' for action ${operationName}` );
			return;
		}
		let inputName = ("structure" in inputType) ? inputType.structure?.name : inputType.name;
		writer.writeLine(`action->bind_input_structure( '${this._className}=>${inputName}' ).`);
	}

	private _writeReturn(writer: CodeWriter, operation: any, operationName: string){
		let multiplicity = ("items" in operation?.returns) ? ABAP.Cardinality.cardinality_1_1 : ABAP.Cardinality.cardinality_0_n;
		writer.writeLine(`action->set_return_multiplicity( '${multiplicity}' ).`);

		// Array
		let returnEntity = Object.getPrototypeOf(operation?.returns);
		if("items" in operation?.returns){
			returnEntity = Object.getPrototypeOf(operation.returns.items);
		}
		writer.writeLine(`action->set_return_entity_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
		writer.writeLine();
	}

	/**
	 * This convert CDSPrimative to a line that the writer can write out
	 * @param  {CDSPrimitive} type type to convert
	 * @param  {string    =    "property"}  propertyVarName name of the property varible
	 * @return {string}            line to write out
	 */
	private _getSetEDMTypeString(type: CDSPrimitive, propertyVarName: string = "property->"): string | undefined {
		switch(type){
			case CDSPrimitive.UUID:
				return `${propertyVarName}set_type_edm_guid( ).`;
				break;
			case CDSPrimitive.Boolean:
				return `${propertyVarName}set_type_edm_boolean( ).`;
				break;
			case CDSPrimitive.Integer:
				return `${propertyVarName}set_type_edm_int32( ).`;
				break;
			case CDSPrimitive.Int16:
				return `${propertyVarName}set_type_edm_int16( ).`;
				break;
			case CDSPrimitive.Int32:
				return `${propertyVarName}set_type_edm_int32( ).`;
				break;
			case CDSPrimitive.Int64:
				return `${propertyVarName}set_type_edm_int64( ).`;
				break;
			case CDSPrimitive.UInt8:
				return `${propertyVarName}set_type_edm_byte( ).`;
				break;
			case CDSPrimitive.Decimal:
				return `${propertyVarName}set_type_edm_decimal( ).`;
				break;
			case CDSPrimitive.Double:
				return `${propertyVarName}set_type_edm_double( ).`;
				break;
			case CDSPrimitive.Date:
				return `${propertyVarName}set_type_edm_date( ).`;
				break;
			case CDSPrimitive.Time:
				return `${propertyVarName}set_type_edm_time( ).`;
				break;
			case CDSPrimitive.DateTime:
				return `${propertyVarName}set_type_edm_datetime( ).`;
				break;
			case CDSPrimitive.Timestamp:
				return `${propertyVarName}set_type_edm_datetimeoffset( ).`;
				break;
			case CDSPrimitive.String:
				return `${propertyVarName}set_type_edm_string( ).`;
				break;
			case CDSPrimitive.Binary:
				return `${propertyVarName}set_type_edm_binary( ).`;
				break;
			case CDSPrimitive.LargeBinary:
				return `${propertyVarName}set_type_edm_binary( ).`;
				break;
			case CDSPrimitive.LargeString:
				return `${propertyVarName}set_type_edm_string( ).`;
				break;
			case CDSPrimitive.Composition:
			case CDSPrimitive.Association:
			default:
				break;
		}
	}

	public generate(): string {
		let writer = new CodeWriter();

		this._writeHeader(writer);

		for(const [operationName, operation] of Object.entries(this._operations)){
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
			let opName = this._getOperationName(operationName, operation);
			let method = (<any>operation?.["@segw.action.method"]) ?? "POST";

			writer.writeLine(`action = me->model->create_action( '${opName}' ).`);
			writer.writeLine(`action->set_http_method( '${method}' ).`);
			
			this._writeBounded(writer, operation, opName);
			this._writeParams(writer, operation, opName);
			this._writeReturn(writer, operation, opName);
		}

		return writer.generate();
	}
}