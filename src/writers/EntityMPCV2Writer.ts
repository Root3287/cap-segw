import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { Primitive as CDSPrimitive } from "../types/cds";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { entity } from "@sap/cds";

export default class EntityMPCV2Writer implements IFCodeGenerator {
	
	private _entity?: entity;
	private _className: string = "";
	private _writer: CodeWriter = new CodeWriter();

	public setEntity(entity: entity){
		this._entity = entity;
	}

	public setClassName(className: string){
		this._className = className;
	}

	private _writeHeader(): void {
		this._writer.writeLine("DATA:").increaseIndent();
		this._writer.writeLine("annotation TYPE REF TO /iwbep/if_mgw_odata_annotation,");
		this._writer.writeLine("entity_type TYPE REF TO /iwbep/if_mgw_odata_entity_typ,");
		this._writer.writeLine("complex_type TYPE REF TO /iwbep/if_mgw_odata_cmplx_type,");
		this._writer.writeLine("property TYPE REF TO /iwbep/if_mgw_odata_property,");
		this._writer.writeLine("entity_set TYPE REF TO /iwbep/if_mgw_odata_entity_set.");
		// TODO: Create Types
		// this._writer.writeLine(`referenced_entity TYPE ${this._class.name}~${this._class.publicSection.types[entity.name]}`);
		this._writer.decreaseIndent().writeLine().writeLine();
	}

	private _writeProperties(property: any){
		// Loop over properties
		let propertyName = (<any>property)?.["@segw.name"] ?? property.name; 
		let abapFieldName = (<any>property)?.["@segw.abap.name"] ?? (<any>property)?.["@segw.name"] ?? property.name;
		this._writer.writeLine("property = entity_type->create_property(").increaseIndent();
		this._writer.writeLine(`iv_property_name = '${propertyName}'`);
		this._writer.writeLine(`iv_abap_fieldname = '${abapFieldName}'`);
		this._writer.decreaseIndent().writeLine(").");
		
		if(property?.key)
			this._writer.writeLine("property->set_is_key( ).");

		this._writer.writeLine(this._getSetEDMTypeString((<CDSPrimitive>property.type)));
		
		// Main OData Annotations
		// this._writer.writeLine("property->set_precison( iv_precision = ).");
		if((<any>property)?.length)
			this._writer.writeLine(`property->set_maxlength( iv_max_length = ${(<any>property)?.length} ).`);
		
		const readOnly = ((<any>entity)?.["@readonly"] || (<any>property)?.["@readonly"]);
		let readOnlyAbap = ABAPUtils.toABAPBool(!readOnly);
		this._writer.writeLine(`property->set_creatable( ${readOnlyAbap} ).`);
		this._writer.writeLine(`property->set_updatable( ${readOnlyAbap} ).`);
		
		const nullable = ABAPUtils.toABAPBool( !(<any>property)?.["notNull"] );
		this._writer.writeLine(`property->set_nullable( ${nullable} ).`);
		
		// Documentation is sparse on this one...
		if((<any>property)?.["@segw.sortable"]){
			let abapBool = ABAPUtils.toABAPBool((<any>property)?.["@segw.sortable"]);
			this._writer.writeLine(`property->set_sortable( ${abapBool} ).`);
		}
		
		// Documentation is sparse on this one..
		if((<any>property)?.["@segw.filterable"]){
			let abapBool = ABAPUtils.toABAPBool((<any>property)?.["@segw.filterable"]);
			this._writer.writeLine(`property->set_filterable( ${abapBool} ).`);
		}

		if((<any>property)?.["@segw.conversion"]){
			let abapBool = ABAPUtils.toABAPBool( !(<any>property)?.["@segw.conversion"]);
			this._writer.writeLine(`property->set_no_conversion( ${abapBool} ).`);
		}
		
		// TODO: Annotation
		// this._writer.writeLine("property->/iwbep/if_mgw_odata_annotatabl~create_annotation( 'sap' )->add(").increaseIndent();
		// this._writer.writeLine("EXPORTING").increaseIndent();
		// this._writer.writeLine("iv_key = 'unicode'");
		// this._writer.writeLine("iv_value = 'false'");
		// this._writer.decreaseIndent().writeLine(").");
		
		this._writer.writeLine();
		this._writer.writeLine();
	}

	private _writeEntitySet() {
		let entityName = ABAPUtils.getABAPName(this._entity);
		let entitySetName = (<any>this._entity)?.["@segw.set.name"] ?? `${entityName}Set`;
		this._writer.writeLine(`entity_set = entity_type->create_entity_set( '${entitySetName}' ).`).writeLine();
		
		let readOnlyAbap = ABAPUtils.toABAPBool(!(<any>this._entity)?.["@readonly"]);
		this._writer.writeLine(`entity_set->set_creatable( ${readOnlyAbap} ).`);
		this._writer.writeLine(`entity_set->set_updatable( ${readOnlyAbap} ).`);
		this._writer.writeLine(`entity_set->set_deletable( ${readOnlyAbap} ).`);
		this._writer.writeLine();
		
		if((<any>this._entity)?.["@segw.pageable"]){
			this._writer.writeLine(`entity_set->set_pageable( ${ABAPUtils.toABAPBool((<any>this._entity)?.["@segw.sortable"])} ).`);
		}
		if((<any>this._entity)?.["@segw.addressable"]){
			this._writer.writeLine(`entity_set->set_addressable( ${ABAPUtils.toABAPBool((<any>this._entity)?.["@segw.addressable"])} ).`);
		}
		if((<any>this._entity)?.["@segw.ftxt_search"]){
			this._writer.writeLine(`entity_set->set_has_ftxt_search( ${ABAPUtils.toABAPBool((<any>this._entity)?.["@segw.ftxt_search"])} ).`);
		}
		if((<any>this._entity)?.["@segw.subscribable"]){
			this._writer.writeLine(`entity_set->set_subscribable( ${ABAPUtils.toABAPBool((<any>this._entity)?.["@segw.subscribable"])} ).`);
		}
		if((<any>this._entity)?.["@segw.filter_required"]){
			this._writer.writeLine(`entity_set->set_filter_required( ${ABAPUtils.toABAPBool((<any>this._entity)?.["@segw.filter_required"])} ).`);
		}
	}

	/**
	 * This convert CDSPrimative to a line that the this._writer can write out
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

	private _writeBindEntity(){
		let entityName = ABAPUtils.getABAPName(this._entity);
		this._writer.writeLine(`entity_type->bind_structure( `).increaseIndent(); 
		this._writer.writeLine(`iv_structure_name = '${this._className}=>T_${entityName}'`);
		if((<any>this._entity)?.["@segw.abap.type"])
			this._writer.writeLine(`iv_bind_conversion = abap_true`);
		this._writer.decreaseIndent().writeLine(`).`);
		this._writer.writeLine();
	}

	public generate(): string {
		this._writer = new CodeWriter();
		let entityName = ABAPUtils.getABAPName(this._entity);

		this._writeHeader();

		this._writer.writeLine(`" Create Entity Type`);
		this._writer.writeLine("entity_type = me->model->create_entity_type( ").increaseIndent();
		this._writer.writeLine(`iv_entity_type_name = |${entityName}|`);
		this._writer.writeLine(`iv_def_entity_set = abap_false`);
		this._writer.decreaseIndent().writeLine(").").writeLine();

		for(let property of this._entity?.elements ?? []){
			this._writeProperties(property);
		}
		
		this._writer.writeLine();

		this._writeEntitySet();
		this._writeBindEntity();

		return this._writer.generate();
	}
}
