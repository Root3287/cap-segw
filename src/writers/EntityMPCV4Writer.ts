import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { entity } from "@sap/cds";

export default class EntityMPCV4Writer implements IFCodeGenerator {
	
	private _entity?: entity;
	private _className: string = "";
	private _writer: CodeWriter = new CodeWriter();

	public setEntity(entity: entity){
		this._entity = entity;
	}

	public setClassName(className: string){
		this._className = className;
	}

	private _processElement(element: any, varName: string): void {
		let primitive = CDSUtils.cds2edm((<any>element.type));
		let elementPrototype = Object.getPrototypeOf(element);

		let elementName = ABAPUtils.getABAPName(element.name);
		let elementNameInternal = ABAPUtils.getABAPName(element.name).toUpperCase();

		if(primitive || CDSUtils.cds2edm(elementPrototype.type)){
			this._writer.writeLine(`primitive_property = ${varName}->create_prim_property( '${elementNameInternal}' ).`);
			this._writer.writeLine(`primitive_property->set_edm_name( '${elementName}' ).`);

			let primitiveType = CDSUtils.cds2edm(elementPrototype.type) ?? primitive;

			this._writer.writeLine(`primitive_property->set_edm_type( '${primitiveType?.substring(4)}' ).`);

			if(element?.key)
				this._writer.writeLine(`primitive_property->set_is_key( ).`);
			if(!element?.key && !element?.notNull)
				this._writer.writeLine(`primitive_property->set_is_nullable( ).`);
			if(primitive !== "edm.Guid" && (<any>element)?.length)
				this._writer.writeLine(`primitive_property->set_max_length( '${(<any>element).length}' ).`);
		}else if(
			(element.type === "cds.Composition" || element.type === "cds.Association") ||
			(elementPrototype.type === "cds.Composition" || elementPrototype.type === "cds.Association")
		){
			this._writer.writeLine(`nav_property = ${varName}->create_navigation_property( '${elementNameInternal}' ).`);
			this._writer.writeLine(`nav_property->set_edm_name( '${elementName}' ).`);
			// this._writer.writeLine(`nav_property->set_partner( iv_partner = '' iv_complex_property_path = '' ).`);
			// this._writer.writeLine(`nav_property->set_target_entity_type_name( iv_entity_type_name = '' iv_service_ref_name = '' ).`);
			// 1 - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one
			// O - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_one_optional
			// N - /iwbep/if_v4_med_element=>gcs_med_nav_multiplicity-to_many_optional
			let multiplicity = (element?.is2many) ? 'N' : 'O';
			if(element?.["notNull"] && multiplicity === 'O') multiplicity = '1';
			this._writer.writeLine(`nav_property->set_target_multiplicity( '${multiplicity}' ).`);
			// this._writer.writeLine(`nav_property->add_referential_constraint( iv_source_property_path = '' iv_target_property_path = '' ).`);
		}else if(
			(elementPrototype.kind === "type" ) &&
			!(
				element.type === "cds.Composition" ||
				element.type === "cds.Association" ||
				elementPrototype.type === "cds.Composition" ||
				elementPrototype.type === "cds.Association"
			)
		) {
			this._writer.writeLine(`complex_property = ${varName}->create_complex_property( '${elementNameInternal}' ).`);
			this._writer.writeLine(`complex_property->set_edm_name( '${elementName}' ).`);
			this._writer.writeLine(`complex_property->set_complex_type( '${ABAPUtils.getABAPName(elementPrototype).toUpperCase()}' ).`);
			if(!element?.notNull)
				this._writer.writeLine(`complex_property->set_is_nullable( ).`);
		}
		this._writer.writeLine()
	}

	public generate(): string {
		this._writer = new CodeWriter();
		let entityName = ABAPUtils.getABAPName(this._entity);

		this._writer.writeLine("DATA:").increaseIndent();
		this._writer.writeLine("entity_type TYPE REF TO /iwbep/if_v4_med_entity_type,");
		this._writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		this._writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		this._writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		this._writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		this._writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set,");
		this._writer.writeLine(`referenced_entity TYPE ${this._className}=>t_${entityName}.`);
		this._writer.decreaseIndent().writeLine().writeLine();

		this._writer.writeLine(`" Create Entity Type`);
		this._writer.writeLine(`entity_type = model->create_entity_type( '${entityName.toUpperCase()}' ).`);

		// Doesn't Do Deep Reference
		// this._writer.writeLine("entity_type = model->create_entity_type_by_struct( ").increaseIndent();
		// this._writer.writeLine(`iv_entity_type_name = '${entityName.toUpperCase()}'`);
		// this._writer.writeLine(`is_structure = referenced_entity`);
		// this._writer.writeLine(`iv_add_conv_to_prim_props = abap_true`);
		// this._writer.writeLine(`iv_add_f4_help_to_prim_props = abap_true`);
		// this._writer.writeLine(`iv_gen_prim_props = abap_true`);
		// this._writer.decreaseIndent().writeLine(").").writeLine();

		this._writer.writeLine(`" Set External EDM name for entity type`);
		this._writer.writeLine(`entity_type->set_edm_name( |${entityName}| ).`).writeLine();

		for(let element of this._entity?.elements ?? []){
			this._processElement(element, "entity_type");
		}

		this._writer.writeLine(`" Create Entity Set`);
		this._writer.writeLine(`entity_set = entity_type->create_entity_set( '${entityName.toUpperCase()}_SET' ).`);
		// this._writer.writeLine(`entity_set->set_edm_name( ).`);
		this._writer.writeLine();

		return this._writer.generate();
	}
}