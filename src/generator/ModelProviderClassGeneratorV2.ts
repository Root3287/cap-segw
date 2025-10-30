import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import { 
	Class as ABAPClass, 
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod, 
	MethodType as ABAPMethodType,
	Primitive as ABAPPrimative,
	Parameter as ABAPParameter, 
	ParameterReferenceType as ABAPParameterReferenceType,
	Structure as ABAPStructure
} from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import { Primitive as CDSPrimitive } from "../types/cds";
import CodeWriter from "./CodeWriter";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import cds, { entity, struct } from "@sap/cds";

const LOG = cds.log("segw");

export default class ModelProviderClassGeneratorV2 implements IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: ["/iwbep/cl_mgw_push_abs_model"],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
			types: [],
			methods: [],
		},
		protectedSection: {
			type: ABAPClassSectionType.PROTECTED,
			methods: [],
		},
		privateSection: {
			type: ABAPClassSectionType.PRIVATE,
			methods: [],
		}, 
	};

	private _entityDefineMethods: string[] = [];

	private _compilerInfo?: CompilerInfo;

	public constructor(){
	
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public getFileName(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		return `ZCL_${ABAPUtils.getABAPName(service)}_MPC.abap`;
	}

	public addEntity(entity: entity): void {
		if((<any>entity)?.["@segw.ignore"]){
			return;
		}

		let entityName = ABAPUtils.getABAPName(entity);

		if(entityName.length > 128){
			LOG.warn(`${entityName} too long. Consider shortening it with @segw.name`);
		}
		
		const methodName = ((<any>entity)?.["@segw.mpc.define.name"]) ?? `define_${entityName}`;
		
		if(methodName > 30){
			LOG.warn(`Method ${methodName} too long. Consider shortening it with @segw.mpc.define.name`);
		}

		this._createType(entity, entityName);
		
		let defineEntityMethod: ABAPMethod = {
			type: ABAPMethodType.MEMBER,
			name: methodName,
			raising: [ "/iwbep/cx_mgw_med_exception"]
		};

		let writer = new CodeWriter();
		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("annotation TYPE REF TO /iwbep/if_mgw_odata_annotation,");
		writer.writeLine("entity_type TYPE REF TO /iwbep/if_mgw_odata_entity_typ,");
		writer.writeLine("complex_type TYPE REF TO /iwbep/if_mgw_odata_cmplx_type,");
		writer.writeLine("property TYPE REF TO /iwbep/if_mgw_odata_property,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if_mgw_odata_entity_set.");
		// TODO: Create Types
		// writer.writeLine(`referenced_entity TYPE ${this._class.name}~${this._class.publicSection.types[entity.name]}`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine("entity_type = me->model->create_entity_type( ").increaseIndent();
		writer.writeLine(`iv_entity_type_name = |${entityName}|`);
		writer.writeLine(`iv_def_entity_set = abap_false`);
		writer.decreaseIndent().writeLine(").").writeLine();

		for(let property of entity.elements){
			// Loop over properties
			let propertyName = (<any>property)?.["@segw.name"] ?? property.name; 
			let abapFieldName = (<any>property)?.["@segw.abap.name"] ?? (<any>property)?.["@segw.name"] ?? property.name;
			writer.writeLine("property = entity_type->create_property(").increaseIndent();
			writer.writeLine(`iv_property_name = '${propertyName}'`);
			writer.writeLine(`iv_abap_fieldname = '${abapFieldName}'`);
			writer.decreaseIndent().writeLine(").");
			
			if(property?.key)
				writer.writeLine("property->set_is_key( ).");
			
			switch(property.type){
				case CDSPrimitive.UUID:
					writer.writeLine("property->set_type_edm_guid( ).");
					break;
				case CDSPrimitive.Boolean:
					writer.writeLine("property->set_type_edm_boolean( ).");
					break;
				case CDSPrimitive.Integer:
					writer.writeLine("property->set_type_edm_int32( ).");
					break;
				case CDSPrimitive.Int16:
					writer.writeLine("property->set_type_edm_int16( ).");
					break;
				case CDSPrimitive.Int32:
					writer.writeLine("property->set_type_edm_int32( ).");
					break;
				case CDSPrimitive.Int64:
					writer.writeLine("property->set_type_edm_int64( ).");
					break;
				case CDSPrimitive.UInt8:
					writer.writeLine("property->set_type_edm_byte( ).");
					break;
				case CDSPrimitive.Decimal:
					writer.writeLine("property->set_type_edm_decimal( ).");
					break;
				case CDSPrimitive.Double:
					writer.writeLine("property->set_type_edm_double( ).");
					break;
				case CDSPrimitive.Date:
					writer.writeLine("property->set_type_edm_date( ).");
					break;
				case CDSPrimitive.Time:
					writer.writeLine("property->set_type_edm_time( ).");
					break;
				case CDSPrimitive.DateTime:
					writer.writeLine("property->set_type_edm_datetime( ).");
					break;
				case CDSPrimitive.Timestamp:
					writer.writeLine("property->set_type_edm_datetimeoffset( ).");
					break;
				case CDSPrimitive.String:
					writer.writeLine("property->set_type_edm_string( ).");
					break;
				case CDSPrimitive.Binary:
					writer.writeLine("property->set_type_edm_binary( ).");
					break;
				case CDSPrimitive.LargeBinary:
					writer.writeLine("property->set_type_edm_binary( ).");
					break;
				case CDSPrimitive.LargeString:
					writer.writeLine("property->set_type_edm_string( ).");
					break;
				case CDSPrimitive.Composition:
				case CDSPrimitive.Association:
				default:
					let propertyPrototype = Object.getPrototypeOf(property);
					if(propertyPrototype.kind === "type"){
						// this.addStruct(propertyPrototype);
					}
					
					break;
			}
			
			// Main OData Annotations
			// writer.writeLine("property->set_precison( iv_precision = ).");
			if((<any>property)?.length)
				writer.writeLine(`property->set_maxlength( iv_max_length = ${(<any>property)?.length} ).`);
			
			const readOnly = ((<any>entity)?.["@readonly"] || (<any>property)?.["@readonly"]);
			let readOnlyAbap = ABAPUtils.toABAPBool(!readOnly);
			writer.writeLine(`property->set_creatable( ${readOnlyAbap} ).`);
			writer.writeLine(`property->set_updatable( ${readOnlyAbap} ).`);
			
			const nullable = ABAPUtils.toABAPBool( !(<any>property)?.["notNull"] );
			writer.writeLine(`property->set_nullable( ${nullable} ).`);
			
			// Documentation is sparse on this one...
			if((<any>property)?.["@segw.sortable"]){
				let abapBool = ABAPUtils.toABAPBool((<any>property)?.["@segw.sortable"]);
				writer.writeLine(`property->set_sortable( ${abapBool} ).`);
			}
			
			// Documentation is sparse on this one..
			if((<any>property)?.["@segw.filterable"]){
				let abapBool = ABAPUtils.toABAPBool((<any>property)?.["@segw.filterable"]);
				writer.writeLine(`property->set_filterable( ${abapBool} ).`);
			}

			if((<any>property)?.["@segw.conversion"]){
				let abapBool = ABAPUtils.toABAPBool( !(<any>property)?.["@segw.conversion"]);
				writer.writeLine(`property->set_no_conversion( ${abapBool} ).`);
			}
			
			// TODO: Annotation
			// writer.writeLine("property->/iwbep/if_mgw_odata_annotatabl~create_annotation( 'sap' )->add(").increaseIndent();
			// writer.writeLine("EXPORTING").increaseIndent();
			// writer.writeLine("iv_key = 'unicode'");
			// writer.writeLine("iv_value = 'false'");
			// writer.decreaseIndent().writeLine(").");
			
			writer.writeLine();
			writer.writeLine();
		}
		
		writer.writeLine();

		let entitySetName = (<any>entity)?.["@segw.set.name"] ?? `${entityName}Set`;
		writer.writeLine(`entity_set = entity_type->create_entity_set( '${entitySetName}' ).`).writeLine();
		
		let readOnlyAbap = ABAPUtils.toABAPBool(!(<any>entity)?.["@readonly"]);
		writer.writeLine(`entity_set->set_creatable( ${readOnlyAbap} ).`);
		writer.writeLine(`entity_set->set_updatable( ${readOnlyAbap} ).`);
		writer.writeLine(`entity_set->set_deletable( ${readOnlyAbap} ).`);
		writer.writeLine();
		
		if((<any>entity)?.["@segw.pageable"]){
			writer.writeLine(`entity_set->set_pageable( ${ABAPUtils.toABAPBool((<any>entity)?.["@segw.sortable"])} ).`);
		}
		if((<any>entity)?.["@segw.addressable"]){
			writer.writeLine(`entity_set->set_addressable( ${ABAPUtils.toABAPBool((<any>entity)?.["@segw.addressable"])} ).`);
		}
		if((<any>entity)?.["@segw.ftxt_search"]){
			writer.writeLine(`entity_set->set_has_ftxt_search( ${ABAPUtils.toABAPBool((<any>entity)?.["@segw.ftxt_search"])} ).`);
		}
		if((<any>entity)?.["@segw.subscribable"]){
			writer.writeLine(`entity_set->set_subscribable( ${ABAPUtils.toABAPBool((<any>entity)?.["@segw.subscribable"])} ).`);
		}
		if((<any>entity)?.["@segw.filter_required"]){
			writer.writeLine(`entity_set->set_filter_required( ${ABAPUtils.toABAPBool((<any>entity)?.["@segw.filter_required"])} ).`);
		}

		writer.writeLine(`entity_type->bind_structure( `).increaseIndent(); 
		writer.writeLine(`iv_structure_name = '${this._class.name}=>T_${entityName}'`);
		if((<any>entity)?.["@segw.abap.type"])
			writer.writeLine(`iv_bind_conversion = abap_true`);
		writer.decreaseIndent().writeLine(`).`);
		writer.writeLine();

		defineEntityMethod.code = writer.generate().split("\n");
		this._entityDefineMethods.push(defineEntityMethod.name);
		this._class?.protectedSection?.methods?.push(defineEntityMethod);
	};

	public generate(): string {
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const services = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		// TODO: Generate Types
		
		// Generate defines
		for(const entity of services?.entities ?? []){
			this.addEntity(entity);
		}

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "define",
			isRedefinition: true,
			code: [
				`model->set_schema_namespace( |${namespace}| ).`,
				"",
				...this._entityDefineMethods.map((method) => `me->${method}( ).`),
				"\" me->define_associations( ).",
			],
		});

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "get_last_modified",
			isRedefinition: true,
			code: [
				// TODO: UPDATE DATE TIME
				"CONSTANTS: lc_gen_date_time TYPE timestamp VALUE '20250919151019'.",
				"rv_last_modified = super->get_last_modified( ).",
				"IF rv_last_modified LT lc_gen_date_time.",
				"\trv_last_modified = lc_gen_date_time.",
				"ENDIF."
			]
		});

		generator.setABAPClass(this._class);
		return generator.generate();
	}

	private _addAssociation() {
		let writer = new CodeWriter();
		writer.writeLine(`DATA:`).increaseIndent();
		writer.writeLine(`annotation type ref to /iwbep/if_mgw_odata_annotation,`);
		writer.writeLine(`entity_type type ref to /iwbep/if_mgw_odata_entity_typ,`);
		writer.writeLine(`association type ref to /iwbep/if_mgw_odata_assoc,`);
		writer.writeLine(`ref_constraint type ref to /iwbep/if_mgw_odata_ref_constr,`);
		writer.writeLine(`assoc_set type ref to /iwbep/if_mgw_odata_assoc_set,`);
		writer.writeLine(`nav_property type ref to /iwbep/if_mgw_odata_nav_prop.`)
		writer.decreaseIndent().writeLine();

		for(let association of ([] as any)){
			// Create the association
			writer.writeLine(`association = model->create_association(`).increaseIndent();
				writer.writeLine(`iv_association_name - |${association.name}|`);
				writer.writeLine(`iv_left_type = '${association.leftEntity}'`);
				writer.writeLine(`iv_left_card = '${association.leftCardality}'`);
				writer.writeLine(`iv_right_type = '${association.rightEntity}'`);
				writer.writeLine(`iv_right_card = '${association.rightCard}'`);
				writer.writeLine(`iv_def_assoc_set = abap_false`);
			writer.decreaseIndent().writeLine(`).`);

			// Create the Contraints
			writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
			writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
			writer.writeLine(`iv_principal_property = ''`);
			writer.writeLine(`iv_dependent_property = ''`);
			writer.decreaseIndent().writeLine(`).`);

			// Create Association Set
			writer.writeLine(`assoc_set->create_association_set(`).increaseIndent();
			writer.writeLine(`iv_association_set_name = ''`);
			writer.writeLine(`iv_left_entity_set_name = ''`);
			writer.writeLine(`iv_right_entity_set_name = ''`);
			writer.writeLine(`iv_association_name = ''`);
			writer.decreaseIndent().writeLine(').');
		}

		for(let entity of ([] as any)){
			writer.writeLine(`entity_type = model->get_entity_type( iv_entity_name = '' ).`);
			writer.writeLine(`nav_property = entity_type->create_navigation_property(`).increaseIndent();
			writer.writeLine(`iv_property_name = ''`);
			writer.writeLine(`iv_abap_fieldname = ''`);
			writer.writeLine(`iv_association_name = ''`);
			writer.decreaseIndent().writeLine(`).`);
		}

		let code = writer.generate().split('\n');
		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "define_associations",
			isRedefinition: true,
			code: code
		});
	}

	private _createType(entity: any, name: string): void {
		let typeName = `t_${name}`;

		let checkIfTypeExists = (type: string) => {
			let existsInStructures = this._class?.publicSection?.types?.find(s => "name" in s && s?.name === type);
			let existsInTypeAlias = this._class?.publicSection?.types?.find(s => "name" in s && s?.name === type);
			return existsInStructures || existsInTypeAlias;
		}

		let handleTypeAlias = (propertyType: string, propertyPrototypePrimative: string) => {
			if(checkIfTypeExists(propertyType)) return;

			this._class?.publicSection?.types?.push({
				name: propertyType,
				referenceType: ABAPParameterReferenceType.TYPE,
				type: propertyPrototypePrimative
			});
		};

		if(checkIfTypeExists(typeName)){
			return;
		}

		// Check if pre-defined. If so we create a type alias.
		if((<any>entity)?.["@segw.abap.type"]){
			this._class?.publicSection?.types?.push({
				name: typeName,
				referenceType: ABAPParameterReferenceType.TYPE,
				type: (<any>entity)?.["@segw.abap.type"]
			})
			return;
		}

		let abapStructure: ABAPStructure = { name: typeName, parameters: [] };

		// Generate for local
		for(let property of entity.elements){
			// This is not an primative type, but one of the following
			let propertyType = <string>(CDSUtils.cds2abap((<CDSPrimitive>property.type)));
			
			if(property?.["@segw.abap.type"]){
				propertyType = property?.["@segw.abap.type"];
			}

			// - Association
			// - Composition
			// - Complex Type
			// - Type Alias
			if(propertyType === null){

				let propertyPrototype = Object.getPrototypeOf(property);
				let propertyPrototypePrimative = CDSUtils.cds2abap(propertyPrototype.type);

				let isAssociation = (
					property?.type === CDSPrimitive.Association || 
					propertyPrototype?.type === CDSPrimitive.Association
				);
				let isComposition = (
					property?.type === CDSPrimitive.Composition || 
					propertyPrototype?.type === CDSPrimitive.Composition
				);
				if(
					!propertyType && 
					property.kind === "element" && 
					(isAssociation || isComposition)
				){
					continue;
				}

				// Check if type is actually in Prototype
				// If it is it's a type alias
				if(!propertyType && property.kind === "element" && propertyPrototypePrimative){
					propertyType = `t_${ABAPUtils.getABAPName(property.type)}`;
					handleTypeAlias(propertyType, propertyPrototypePrimative);
				}

				// Check if Complex Type
				if(!propertyType && property.kind === "element" && propertyPrototype?.kind === "type"){
					propertyType = `t_${ABAPUtils.getABAPName(property.type)}`;
					this._createType(property, property.type);
				}
			}

			let abapProperty: ABAPParameter = {
				name: property.name,
				referenceType: ABAPParameterReferenceType.TYPE,
				type: propertyType,
			};

			if(propertyType === ABAPPrimative.DECIMAL){
				abapProperty.length = 16;
				abapProperty.decimal = 0;
			}
			
			abapStructure.parameters.push(abapProperty);
		}

		this._class?.publicSection?.types?.push(abapStructure);
		this._class?.publicSection?.types?.push({
			structure: { 
				name: `t${typeName}`, 
				referenceType: ABAPParameterReferenceType.TYPE_STANDARD_TABLE, 
				type: typeName 
			}
		});
	}


}