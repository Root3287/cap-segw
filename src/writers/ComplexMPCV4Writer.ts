import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { entity } from "@sap/cds";

export default class ComplexMPCV4Writer implements IFCodeGenerator {
	
	private _complexTypes: Record<string, any> = {};
	private _className: string = ""; 
	private _writer: CodeWriter = new CodeWriter();

	public setComplexTypes(complexTypes: Record<string, any>){
		Object.assign(this._complexTypes, complexTypes);
	}

	private _writeHeader(){
		this._writer.writeLine("DATA:").increaseIndent();
		this._writer.writeLine("complex_type TYPE REF TO /iwbep/if_v4_med_cplx_type,");
		this._writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		this._writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		this._writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		this._writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop.");
		this._writer.decreaseIndent().writeLine().writeLine();
	}

	private _processElement(element: any, varName: string){
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
			this._complexTypes[ABAPUtils.getABAPName(elementPrototype).toUpperCase()] ??= elementPrototype;
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
		this._writeHeader();

		this._writer.writeLine();

		for(const [complexTypeName, complexType] of Object.entries(this._complexTypes)){
			this._writer.writeLine(`complex_type = model->create_complex_type( '${complexTypeName}' ).`);

			for(let element of complexType.elements){
				this._processElement(element, "complex_type");
			}
		}

		return this._writer.generate();
	}
}