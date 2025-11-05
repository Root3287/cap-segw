import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { entity } from "@sap/cds";

export default class ComplexMPCV4Writer implements IFCodeGenerator {
	
	private _complexTypes: Record<string, any> = {};
	private _className: string = ""; 

	public setComplexTypes(complexTypes: Record<string, any>){
		Object.assign(this._complexTypes, complexTypes);
	}

	private _writeHeader(writer: CodeWriter){
		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("complex_type TYPE REF TO /iwbep/if_v4_med_cplx_type,");
		writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop.");
		writer.decreaseIndent().writeLine().writeLine();
	}

	private _processElement(writer: CodeWriter, element: any, varName: string){
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
			this._complexTypes[ABAPUtils.getABAPName(elementPrototype).toUpperCase()] ??= elementPrototype;
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
		this._writeHeader(writer);

		writer.writeLine();

		for(const [complexTypeName, complexType] of Object.entries(this._complexTypes)){
			writer.writeLine(`complex_type = model->create_complex_type( '${complexTypeName}' ).`);

			for(let element of complexType.elements){
				this._processElement(writer, element, "complex_type");
			}
		}

		return writer.generate();
	}
}