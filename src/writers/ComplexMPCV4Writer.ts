import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { CompilerInfo } from "../types/frontend";
import { Primitive as EDMPrimitive } from "../types/edm";

import cds, { entity } from "@sap/cds";

type Entity = {
	csn: entity,
	csdl: any
};

type ComplexTypeInfo = {
	csn: any;
	csdl: any;
	name: string;
}

type Multiplicity = '1' | 'O' | 'N';

const LOG = cds.log("segw");

export default class ComplexMPCV4Writer implements IFCodeGenerator {
	
	private _compilerInfo?: CompilerInfo;
	private _className: string = ""; 
	private _writer: CodeWriter = new CodeWriter();

	public setCompilerInfo(compilerInfo?: CompilerInfo){
		this._compilerInfo = compilerInfo;
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

	private _processElement(complexType: ComplexTypeInfo, element: any){
		let [propertyName, property] = element;

		if(property?.["$Kind"] === "NavigationProperty"){
			this._processNav(complexType, element);
			return;
		}

		if(property?.["$Type"]){
			this._processComplex(complexType, element);
			return;
		}

		property["$Kind"] ??= EDMPrimitive.String;
		let isPrimitive = property?.["$Kind"].startsWith("Edm");

		if(isPrimitive){
			// this._writer.writeLine(`primitive_property->use_for_operation_advertising( ).`);
			this._processPrimative(complexType, element);
			return;
		}
	}

	private _processPrimative(complexType: ComplexTypeInfo, element: any){
		let [propertyName, property] = element;
		let internalName = property?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(property) ?? ABAPUtils.getABAPName(propertyName);
		if(internalName.length > 30) LOG.warn(`Internal Name ${internalName} is too long. Consider shortening it with '@segw.abap.name'`);

		let kind = element["$Kind"] ?? EDMPrimitive.String;

		this._writer.writeLine(`primitive_property = complex_type->create_prim_property( '${internalName.toUpperCase()}' ).`);
		this._writer.writeLine(`primitive_property->set_edm_name( '${propertyName}' ).`);
		this._writer.writeLine(`primitive_property->set_edm_type( '${kind.substring(4)}' ).`);
		if(property?.key)
			this._writer.writeLine(`primitive_property->set_is_key( ).`);
		if(!property?.key && !property?.notNull)
			this._writer.writeLine(`primitive_property->set_is_nullable( ).`);
		if(kind !== EDMPrimitive.Guid && (<any>property)?.["$MaxLength"])
			this._writer.writeLine(`primitive_property->set_max_length( '${(<any>property)?.["$MaxLength"]}' ).`);
		// this._writer.writeLine(`primitive_property->set_precision( ).`);
		// this._writer.writeLine(`primitive_property->set_scale( ).`);
		// this._writer.writeLine(`primitive_property->set_is_uppercase( ).`);
		// this._writer.writeLine(`primitive_property->set_is_technical( ).`);
		this._writer.writeLine();
	}

	private _processComplex(complexType: ComplexTypeInfo, element: any){
		const [complexName, complexProperty] = element;
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];

		let complexCSNTarget = [
			"services",
			namespace,
			"model",
			"definitions",
			complexProperty?.["$Type"]
		].reduce((arr: any, curr: any) => arr[curr], this._compilerInfo?.csn);

		this._writer.writeLine(`complex_property = complex_type->create_complex_property( '${complexName.toUpperCase()}' ).`);
		this._writer.writeLine(`complex_property->set_edm_name( '${complexName}' ).`);
		this._writer.writeLine(`complex_property->set_complex_type( '${ABAPUtils.getABAPName(complexCSNTarget).replace(/\./g, '_').toUpperCase()}' ).`);
		if(!complexProperty?.key && !complexProperty?.notNull)
			this._writer.writeLine(`complex_property->set_is_nullable( ).`);
		this._writer.writeLine();
	}

	private _getMultiplicity(complexType: ComplexTypeInfo, element: any): Multiplicity {
		// Multiplicity: 'N' (to-many), 'O' (optional to-one), '1' (required to-one)
		let multiplicity: Multiplicity;
		if (element?.$Collection) {
			multiplicity = 'N';
		} else {
			let [principal] = Object.entries(element?.["$ReferentialConstraint"] ?? {})?.[0];
			let principalElement =  complexType?.csdl?.[principal];
			multiplicity = (principalElement?.["notNull"]) ? '1' : 'O';
		}
		multiplicity = element?.["@segw.abap.multiplicity"] ?? multiplicity;
		return multiplicity;
	}

	private _isMultiplicityNullable(multiplicity: Multiplicity): boolean {
		return (multiplicity === '1') ? false : true;
	};

	private _warnDependentNull(multiplicity: Multiplicity, principalNullable: boolean, dependentNullable: boolean): boolean {
		// Netweaver 7.50
		// Principal property is nullable OR navigation is nullable => Dependent property must be nullable
		return (
			(principalNullable && !dependentNullable ) ||
			(this._isMultiplicityNullable(multiplicity) && !dependentNullable)
		)
	}

	private _warnDependentNotNull(multiplicity: Multiplicity, principalNullable: boolean, dependentNullable: boolean): boolean {
		// Netweaver 7.50
		// if navigation property is not nullable and principal property is not nullable => dependent_property be set to not nullable
		return (!this._isMultiplicityNullable(multiplicity) && !principalNullable && dependentNullable);
	};

	private _processNav(complexType: ComplexTypeInfo, property: any){
		const [elementName, element] = property;
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];

		// Internal/external names
		const navNameEdm      = ABAPUtils.getABAPName(elementName);          // external EDM name
		const navNameInternal = ABAPUtils.getABAPName(elementName).toUpperCase(); // internal name

		// Target entity type (qualified name from CSDL)
		let targetTypeQName = element?.$Type;
		if (!targetTypeQName) return; // nothing to wire
		targetTypeQName = targetTypeQName.substring((<any>complexType?.csn)?._service.name.length+1);

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

		let multiplicity = this._getMultiplicity(complexType, element);

		let fixCSDL = element?.["@segw.association.fix"];

		for(const [principal, dependent] of Object.entries<string>(element?.["$ReferentialConstraint"] ?? {})){
			let principalElement = complexType?.csdl?.[principal];
			let dependentElement = target?.csn?.elements?.[dependent];
			let depNull = this._warnDependentNull(
				multiplicity, 
				!principalElement?.["notNull"], 
				!dependentElement?.["key"] && !dependentElement?.["notNull"]
			);
			let depNotNull = this._warnDependentNotNull(
				multiplicity, 
				!principalElement?.["notNull"], 
				!dependentElement?.["key"] && !dependentElement?.["notNull"]
			);
			
			if(!fixCSDL && depNull)
				LOG.warn(`Principal property '${principal}' of '${ABAPUtils.getABAPName(complexType?.csn)}.${elementName}' is nullable, dependent property '${ABAPUtils.getABAPName(target.csn)}.${dependent}' must be nullable! Use '@segw.association.fix' or define the association constraints manually!`);
			
			if(!fixCSDL && depNotNull)
				LOG.warn(`Navigation and Principal property of '${complexType?.csn.name}.${elementName}' is not nullable, dependent property ${dependent} be set to not nullable! Use '@segw.association.fix' or define the association constraints manually!`);
		
			if(fixCSDL && depNull){
				if(dependentElement?.["key"]){ principalElement["notNull"] = true; }
			}

			if(fixCSDL && depNotNull){}

			if(fixCSDL){
				multiplicity = this._getMultiplicity(complexType, element);	
			}
		}

		this._writer.writeLine(`nav_property = complex_type->create_navigation_property( '${navNameInternal}' ).`);
		this._writer.writeLine(`nav_property->set_edm_name( '${navNameEdm}' ).`);
		this._writer.writeLine(`nav_property->set_target_entity_type_name( '${targetInternal}' ).`);
		this._writer.writeLine(`nav_property->set_target_multiplicity( '${multiplicity}' ).`);
		// this._writer.writeLine(`nav_property->is_containment_navigation( ).`);
		// this._writer.writeLine(`nav_property->set_on_delete_action( '' ).`);
		
		if(element?.$Partner){
			const partnerInternal = ABAPUtils.getABAPName(element.$Partner).toUpperCase();
			this._writer.writeLine(`nav_property->set_partner( '${partnerInternal}' ).`);
		}

		// Referential constraints: { dependent: principal }
		for (const [principal, dependent] of Object.entries<string>(element?.["$ReferentialConstraint"] ?? {})) {
			const depInt = ABAPUtils.getABAPName(dependent).toUpperCase();
			const priInt = ABAPUtils.getABAPName(principal).toUpperCase();
			this._writer.writeLine(`nav_property->add_referential_constraint( iv_source_property_path = '${priInt}' iv_target_property_path = '${depInt}' ).`);
		}

		this._writer.writeLine();
	}

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		this._writer = new CodeWriter();
		this._writeHeader();

		this._writer.writeLine();

		let complexTypes = Object.entries(this._compilerInfo?.csdl?.[namespace]).filter((val: any) => { 
			let [key, value] = val; 
			return value?.["$Kind"] === "ComplexType"; 
		});


		for(const [complexTypeName, complexType] of complexTypes){
			let complexTypeCSN = [
				"services",
				namespace,
				"model",
				"definitions",
				`${namespace}.${complexTypeName}`
			].reduce((arr: any, curr: any) => arr?.[curr], this._compilerInfo?.csn);
			// Fallback to definitions when model metadata is not present (e.g. inline parsed CSN)
			complexTypeCSN ??= this._compilerInfo?.csn?.definitions?.[`${namespace}.${complexTypeName}`] ?? this._compilerInfo?.csn?.definitions?.[complexTypeName];
			if(!complexTypeCSN?.elements) continue;

			let copyCDS2CSDL = (elementName: string, cds: any) =>{
				if(!(<any>complexType)?.[elementName]) return;
				Object.assign((<any>complexType)[elementName], cds);
			}

			// Merge CDS to CSDL
			for(let [csnElementName, csnElement] of Object.entries((<any>complexTypeCSN.elements))){
				if("elements" in (<any>csnElement)){
					// This could be an flattend type
					Object.entries((<any>csnElement)?.elements ?? {})
						  .map(([propName, property]) => [`${csnElementName}_${propName}`, property])
						  .forEach(([propName, property]) => copyCDS2CSDL((<any>propName), property) );
					continue;
				}
				copyCDS2CSDL(csnElementName, csnElement);
			}

			let name = ABAPUtils.getABAPName(complexTypeCSN).replace(/\./, '_');
			this._writer.writeLine(`complex_type = model->create_complex_type( '${name.toUpperCase()}' ).`);
			this._writer.writeLine(`complex_type->set_edm_name( |${name}| ).`);
			this._writer.writeLine();

			for(let element of Object.entries((<any>complexType)) ?? []){
				const [elementName, elementValue] = element;
				if(elementName.startsWith('$')) continue;
				this._processElement({ csn: complexTypeCSN, csdl: complexType, name: name }, element);
			}
		}

		return this._writer.generate();
	}
}
