import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";
import { Primitive as EDMPrimitive } from "../types/edm";
import { CompilerInfo } from "../types/frontend";

import cds, { entity } from "@sap/cds";

type Entity = {
	csn: entity,
	csdl: any
};

const LOG = cds.log("segw");

export default class EntityMPCV4Writer implements IFCodeGenerator {
	
	private _entity?: Entity;
	private _className: string = "";
	private _writer: CodeWriter = new CodeWriter();
	private _compilerInfo?: CompilerInfo;

	public setCompilerInfo(compilerInfo?: CompilerInfo){
		this._compilerInfo = compilerInfo;
	}

	public setEntity(csnEntity: entity, csdlEntity: any){
		this._entity = { csn: csnEntity, csdl: csdlEntity };
	}

	public setClassName(className: string){
		this._className = className;
	}

	private _writeElements(){
		if((<any>this._entity?.csn)?.["@segw.expand"]){
			LOG.warn("@segw.expand is experimental!");
			for(let element of this._entity?.csn?.elements ?? []){
				this._processElement(element);
			}
			return;
		}

		let copyCDS2CSDL = (elementName: string, cds: any) =>{
			if(!this._entity?.csdl?.[elementName]) return;
			Object.assign(this._entity.csdl[elementName], cds);
		}

		// Copy over all the attributes over to CSDL.
		// Process Elements that is marked as expanded
		let processedExpandedNames: string[] = [];
		for(let [elementName, element] of Object.entries((<any>this._entity?.csn.elements))){
			if("elements" in (<any>element)){
				// This could be an flattend type
				Object.entries((<any>element)?.elements ?? {})
					  .map(([propName, property]) => [`${elementName}_${propName}`, property])
					  .forEach(([propName, property]) => copyCDS2CSDL((<any>propName), property) );
			}else{
				copyCDS2CSDL(elementName, element);
			}
			if(!(<any>element)?.["@segw.expand"]) continue;
			LOG.warn("@segw.expand is experimental!");
			processedExpandedNames.push(elementName);
			this._processElement(element);
		}

		for(let [elementName, element] of Object.entries(this._entity?.csdl) ?? []){
			if(elementName.startsWith("$") || elementName.startsWith("@")) continue;
			if(processedExpandedNames.some((e) => elementName.startsWith(`${e}_`))) continue;
			this._processCSDLElement(elementName, element)
		}
	}

	private _processElement(element: any): void {
		let primitive = CDSUtils.cds2edm((<any>element.type));
		let elementPrototype = Object.getPrototypeOf(element);

		let elementName = ABAPUtils.getABAPName(element.name).replace(/\./g, '_');
		let elementNameInternal = ABAPUtils.getABAPName(element.name).toUpperCase();

		if(primitive || CDSUtils.cds2edm(elementPrototype.type)){
			this._writer.writeLine(`primitive_property = entity_type->create_prim_property( '${elementNameInternal}' ).`);
			this._writer.writeLine(`primitive_property->set_edm_name( '${elementName}' ).`);

			let primitiveType = CDSUtils.cds2edm(elementPrototype.type) ?? primitive;

			this._writer.writeLine(`primitive_property->set_edm_type( '${primitiveType?.substring(4)}' ).`);

			if(element?.key)
				this._writer.writeLine(`primitive_property->set_is_key( ).`);
			if(!element?.key && !element?.notNull)
				this._writer.writeLine(`primitive_property->set_is_nullable( ).`);
			if(primitive !== EDMPrimitive.Guid && (<any>element)?.length)
				this._writer.writeLine(`primitive_property->set_max_length( '${(<any>element).length}' ).`);
		}else if(
			(element.type === "cds.Composition" || element.type === "cds.Association") ||
			(elementPrototype.type === "cds.Composition" || elementPrototype.type === "cds.Association")
		){
			this._writer.writeLine(`nav_property = entity_type->create_navigation_property( '${elementNameInternal}' ).`);
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
			this._writer.writeLine(`complex_property = entity_type->create_complex_property( '${elementNameInternal}' ).`);
			this._writer.writeLine(`complex_property->set_edm_name( '${elementName}' ).`);
			this._writer.writeLine(`complex_property->set_complex_type( '${ABAPUtils.getABAPName(elementPrototype).toUpperCase()}' ).`);
			if(!element?.notNull)
				this._writer.writeLine(`complex_property->set_is_nullable( ).`);
		}
		this._writer.writeLine()
	}

	private _processCSDLElement(elementName: string, element: any){
		if(element?.["$Kind"] === "NavigationProperty"){
			this._writeCSDLNavProperty(elementName, element);
			return;
		}

		let kind = element["$Kind"] ?? EDMPrimitive.String;

		let internalName = element?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(element) ?? ABAPUtils.getABAPName(elementName);
		
		if(internalName.length > 30) LOG.warn(`Internal Name ${internalName} is too long. Consider shortening it with '@segw.abap.name'`);
		this._writer.writeLine(`primitive_property = entity_type->create_prim_property( '${internalName.toUpperCase()}' ).`);
		this._writer.writeLine(`primitive_property->set_edm_name( '${elementName}' ).`);

		if(element?.key)
				this._writer.writeLine(`primitive_property->set_is_key( ).`);
		if(!element?.key && !element?.notNull)
			this._writer.writeLine(`primitive_property->set_is_nullable( ).`);
		if(element !== EDMPrimitive.Guid && (<any>element)?.["$MaxLength"])
			this._writer.writeLine(`primitive_property->set_max_length( '${(<any>element)?.["$MaxLength"]}' ).`);
		this._writer.writeLine(`primitive_property->set_edm_type( '${kind.substring(4)}' ).`);
		this._writer.writeLine();
	}

	private _writeCSDLNavProperty(elementName: string, element: any){
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];

		type Multiplicity = '1' | 'O' | 'N';

		let isMultiplicityNullable = (multiplicity: Multiplicity): boolean => {
			return (multiplicity === '1') ? false : true;
		};

		let warnDependentNull = (multiplicity: Multiplicity, principalNullable: boolean, dependentNullable: boolean): boolean => {
			// Netweaver 7.50
			// Principal property is nullable OR navigation is nullable => Dependent property must be nullable
			return (
				(principalNullable && !dependentNullable ) ||
				( isMultiplicityNullable(multiplicity) && !dependentNullable)
			)
		};

		let warnDependentNotNull = (multiplicity: Multiplicity, principalNullable: boolean, dependentNullable: boolean): boolean => {
			// Netweaver 7.50
			// if navigation property is not nullable and principal property is not nullable => dependent_property be set to not nullable
			return (!isMultiplicityNullable(multiplicity) && !principalNullable && dependentNullable);
		};

		// Internal/external names
		const navNameEdm      = ABAPUtils.getABAPName(elementName);          // external EDM name
		const navNameInternal = ABAPUtils.getABAPName(elementName).toUpperCase(); // internal name

		// Target entity type (qualified name from CSDL)
		let targetTypeQName = element?.$Type;
		if (!targetTypeQName) return; // nothing to wire
		targetTypeQName = targetTypeQName.substring((<any>this._entity?.csn)?._service.name.length+1);

		let target: Entity = {
			csn: [ 
				"services", 
				namespace, 
				"entities", 
				element?.["target"].substring(namespace.length+1)
			].reduce((acc: any, curr: any) => acc[curr], this._compilerInfo?.csn),
			csdl: this._compilerInfo?.csdl?.[namespace]?.[targetTypeQName],
		};

		const targetInternal = ABAPUtils.getABAPName(target.csn).replace(/\./g, '_').toUpperCase();

		// Multiplicity: 'N' (to-many), 'O' (optional to-one), '1' (required to-one)
		let multiplicity: Multiplicity;
		if (element?.$Collection) {
			multiplicity = 'N';
		} else {
			let [principal] = Object.entries(element?.["$ReferentialConstraint"] ?? {})?.[0];
			let principalElement =  this._entity?.csdl?.[principal];
			multiplicity = (principalElement?.["notNull"]) ? '1' : 'O';
		}
		multiplicity = element?.["segw.abap.multiplicity"] ?? multiplicity;

		for(const [principal, dependent] of Object.entries<string>(element?.["$ReferentialConstraint"] ?? {})){
			let principalElement = this._entity?.csdl?.[principal];
			let dependentElement = target?.csn?.elements?.[dependent];
			
			if(warnDependentNull(multiplicity, !principalElement?.["notNull"], !dependentElement?.["key"] && !dependentElement?.["notNull"]))
				LOG.warn(`Principal property '${principal}' of '${ABAPUtils.getABAPName(this._entity?.csn)}.${elementName}' is nullable, dependent property '${ABAPUtils.getABAPName(target.csn)}.${dependent}' must be nullable!`);
			
			if(warnDependentNotNull(multiplicity, !principalElement?.["notNull"], !dependentElement?.["key"] && !dependentElement?.["notNull"]))
				LOG.warn(`Navigation and Principal property of '${this._entity?.csn.name}.${elementName}' is not nullable, dependent property ${dependent} be set to nullable!`);
		}

		// Create nav + basic wiring
		this._writer.writeLine(`nav_property = entity_type->create_navigation_property( '${navNameInternal}' ).`);
		this._writer.writeLine(`nav_property->set_edm_name( '${navNameEdm}' ).`);
		this._writer.writeLine(
			`nav_property->set_target_entity_type_name( iv_entity_type_name = '${targetInternal}' iv_service_ref_name = '' ).`
		);
		this._writer.writeLine(`nav_property->set_target_multiplicity( '${multiplicity}' ).`);

		// Partner from CSDL (no complex path info in CSDL; leave empty)
		if (element?.$Partner) {
			const partnerInternal = ABAPUtils.getABAPName(element.$Partner).toUpperCase();
			this._writer.writeLine(`nav_property->set_partner( iv_partner = '${partnerInternal}' iv_complex_property_path = '' ).`);
		}

		// Referential constraints: { dependent: principal }
		for (const [principal, dependent] of Object.entries<string>(element?.["$ReferentialConstraint"] ?? {})) {
			const depInt = ABAPUtils.getABAPName(dependent).toUpperCase();
			const priInt = ABAPUtils.getABAPName(principal).toUpperCase();
			this._writer.writeLine(`nav_property->add_referential_constraint( iv_source_property_path = '${depInt}' iv_target_property_path = '${priInt}' ).`);
		}

		this._writer.writeLine();
	}

	public generate(): string {
		this._writer = new CodeWriter();
		let entityName = ABAPUtils.getABAPName(this._entity?.csn).replace(/\./g, '_');

		this._writer.writeLine("DATA:").increaseIndent();
		this._writer.writeLine("entity_type TYPE REF TO /iwbep/if_v4_med_entity_type,");
		this._writer.writeLine("primitive_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		this._writer.writeLine("primitive_property type ref to /iwbep/if_v4_med_prim_prop,");
		this._writer.writeLine("complex_property type ref to /iwbep/if_v4_med_cplx_prop,");
		this._writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		this._writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set.");
		//this._writer.writeLine(`referenced_entity TYPE ${this._className}=>t_${entityName}.`);
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

		this._writeElements();

		this._writer.writeLine(`" Create Entity Set`);
		this._writer.writeLine(`entity_set = entity_type->create_entity_set( '${entityName.toUpperCase()}_SET' ).`);
		// this._writer.writeLine(`entity_set->set_edm_name( ).`);
		this._writer.writeLine();

		return this._writer.generate();
	}
}