import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { entity } from "@sap/cds";

export default class EntityMPCV4Writer implements IFCodeGenerator {
	
	private _entity?: entity;
	private _className: string = ""; 

	public setEntity(entity: entity){
		this._entity = entity;
	}

	public setClassName(className: string){
		this._className = className;
	}

	private _processElement(writer: CodeWriter, element: any, varName: string): void {
		let primitive = CDSUtils.cds2edm((<any>element.type));
		let elementPrototype = Object.getPrototypeOf(element);

		let elementName = ABAPUtils.getABAPName(element.name);
		let elementNameInternal = ABAPUtils.getABAPName(element.name).toUpperCase();

		if(primitive || CDSUtils.cds2edm(elementPrototype.type)){
			writer.writeLine(`primitive_property = ${varName}->create_prim_property( '${elementNameInternal}' ).`);
			writer.writeLine(`primitive_property->set_edm_name( '${elementName}' ).`);

			let primitiveType = CDSUtils.cds2edm(elementPrototype.type) ?? primitive;

			writer.writeLine(`primitive_property->set_edm_type( '${primitiveType?.substring(4)}' ).`);

			if(element?.key)
				writer.writeLine(`primitive_property->set_is_key( ).`);
			if(!element?.key && !element?.notNull)
				writer.writeLine(`primitive_property->set_is_nullable( ).`);
			if(primitive !== "edm.Guid" && (<any>element)?.length)
				writer.writeLine(`primitive_property->set_max_length( '${(<any>element).length}' ).`);
		}else if(
			(element.type === "cds.Composition" || element.type === "cds.Association") ||
			(elementPrototype.type === "cds.Composition" || elementPrototype.type === "cds.Association")
		){
			writer.writeLine(`nav_property = ${varName}->create_navigation_property( '${elementNameInternal}' ).`);
			writer.writeLine(`nav_property->set_edm_name( '${elementName}' ).`);
			// writer.writeLine(`nav_property->set_partner( iv_partner = '' iv_complex_property_path = '' ).`);
			// writer.writeLine(`nav_property->set_target_entity_type_name( iv_entity_type_name = '' iv_service_ref_name = '' ).`);
			// 1 - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one
			// O - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one_optional
			// N - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_many_optional
			let multiplicity = (element?.is2many) ? 'N' : 'O';
			if(element?.["notNull"] && multiplicity === 'O') multiplicity = '1';
			writer.writeLine(`nav_property->set_target_multiplicity( '${multiplicity}' ).`);
			// writer.writeLine(`nav_property->add_referential_constraint( iv_source_property_path = '' iv_target_property_path = '' ).`);
		}else if(
			(elementPrototype.kind === "type" ) &&
			!(
				element.type === "cds.Composition" ||
				element.type === "cds.Association" ||
				elementPrototype.type === "cds.Composition" ||
				elementPrototype.type === "cds.Association"
			)
		) {
			writer.writeLine(`complex_property = ${varName}->create_complex_property( '${elementNameInternal}' ).`);
			writer.writeLine(`complex_property->set_edm_name( '${elementName}' ).`);
			writer.writeLine(`complex_property->set_complex_type( '${ABAPUtils.getABAPName(elementPrototype).toUpperCase()}' ).`);
			if(!element?.notNull)
				writer.writeLine(`complex_property->set_is_nullable( ).`);
		}
		writer.writeLine()
	}

	public generate(): string {
		let writer = new CodeWriter();
		let entityName = ABAPUtils.getABAPName(this._entity);

		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("entity_type TYPE REF TO /iwbep/if_v4_med_entity_type,");
		writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set,");
		writer.writeLine(`referenced_entity TYPE ${this._className}=>t_${entityName}.`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine(`entity_type = model->create_entity_type( '${entityName.toUpperCase()}' ).`);

		// Doesn't Do Deep Reference
		// writer.writeLine("entity_type = model->create_entity_type_by_struct( ").increaseIndent();
		// writer.writeLine(`iv_entity_type_name = '${entityName.toUpperCase()}'`);
		// writer.writeLine(`is_structure = referenced_entity`);
		// writer.writeLine(`iv_add_conv_to_prim_props = abap_true`);
		// writer.writeLine(`iv_add_f4_help_to_prim_props = abap_true`);
		// writer.writeLine(`iv_gen_prim_props = abap_true`);
		// writer.decreaseIndent().writeLine(").").writeLine();

		writer.writeLine(`" Set External EDM name for entity type`);
		writer.writeLine(`entity_type->set_edm_name( |${entityName}| ).`).writeLine();

		for(let element of this._entity?.elements ?? []){
			this._processElement(writer, element, "entity_type");
		}

		writer.writeLine(`" Create Entity Set`);
		writer.writeLine(`entity_set = entity_type->create_entity_set( '${entityName.toUpperCase()}_SET' ).`);
		// writer.writeLine(`entity_set->set_edm_name( ).`);
		writer.writeLine();

		return writer.generate();
	}
}