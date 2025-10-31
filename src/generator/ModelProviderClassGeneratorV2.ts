import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import {
	Cardinality,
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

import CDSTypeConverter from "../converters/CDSTypeConverter";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";
import { getCardinalityPair } from "../utils/Cardinality";

import cds, { csn, entity, struct } from "@sap/cds";

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

			writer.writeLine(this._getSetEDMTypeString((<CDSPrimitive>property.type)));
			
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
		const service = this._compilerInfo?.csn.services[namespace];
		let generator = new ABAPGenerator();

		this._class.name = this.getFileName().split('.')[0];

		let typeConverter = new CDSTypeConverter();
		typeConverter.setService(service);
		if(this._class?.publicSection?.types)
			this._class.publicSection.types = typeConverter.getABAPTypes();

		
		// Generate defines
		for(const entity of service?.entities ?? []){
			this.addEntity(entity);
		}

		let associations = this._getAssociations(service);
		this._writeAssociations(associations);

		this._processActions(service);

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "define",
			isRedefinition: true,
			code: [
				`model->set_schema_namespace( |${namespace}| ).`,
				"",
				...this._entityDefineMethods.map((method) => `me->${method}( ).`),
				"me->define_associations( ).",
				"me->define_actions( )."
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

	private _getAssociations(service: any) {
		let isAssociation = (e: any) => e.type === CDSPrimitive.Composition || e.type === CDSPrimitive.Association;
		let associations: any = [];
		for(const entity of service?.entities ?? []){
			associations.push(
				...Object.values(entity.elements)?.filter(
					(element: any) => isAssociation(element) 
				) 
			);
		}
		return associations;
	}

	private _writeAssociations(associations: any[]): void {
		let writer = new CodeWriter();
		writer.writeLine(`DATA:`).increaseIndent();
		writer.writeLine(`annotation type ref to /iwbep/if_mgw_odata_annotation,`);
		writer.writeLine(`entity_type type ref to /iwbep/if_mgw_odata_entity_typ,`);
		writer.writeLine(`association type ref to /iwbep/if_mgw_odata_assoc,`);
		writer.writeLine(`ref_constraint type ref to /iwbep/if_mgw_odata_ref_constr,`);
		writer.writeLine(`assoc_set type ref to /iwbep/if_mgw_odata_assoc_set,`);
		writer.writeLine(`nav_property type ref to /iwbep/if_mgw_odata_nav_prop.`)
		writer.decreaseIndent().writeLine();

		let visitedNodes: any[] = [];
		for(let association of associations){
			let associationName = association?.["@segw.association.name"] ?? `${ABAPUtils.getABAPName(association.parent)}_${ABAPUtils.getABAPName(association._target)}`;
			let parentName = ABAPUtils.getABAPName(association.parent);
			let targetName = ABAPUtils.getABAPName(association._target);

			if((<any>association)?.["@segw.association.ignore"]) continue;

			// We already process the association
			if(visitedNodes.find((nodes) => nodes.parent === association.parent && nodes.target === association._target ))
				continue;

			let inverseAssociation = associations.find(
				(node) => node._target === association.parent && node.parent === association._target
			);

			let [leftCard, rightCard] = <any>(getCardinalityPair(association, inverseAssociation));

			// Create the association
			writer.writeLine(`association = model->create_association(`).increaseIndent();
				writer.writeLine(`iv_association_name = |${associationName}|`);
				writer.writeLine(`iv_left_type = '${parentName}'`);
				writer.writeLine(`iv_right_type = '${targetName}'`);
				writer.writeLine(`iv_left_card = '${leftCard}'`);
				writer.writeLine(`iv_right_card = '${rightCard}'`);
				writer.writeLine(`iv_def_assoc_set = abap_false`);
			writer.decreaseIndent().writeLine(`).`);

			// Create the Contraints
			// TODO: Handle many constraints
			if(association?.foreignKeys){
				writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				writer.writeLine(`iv_principal_property = '${association.name}'`);
				writer.writeLine(`iv_dependent_property = '${(<any>Object.values(association?.foreignKeys)?.[0])?.name}'`);
				writer.decreaseIndent().writeLine(`).`);
			}
			if(association?.on){
				let principalProperty = association.on[0].ref.slice(1).join('.');
				let dependentProperty = association.on[2].ref.filter((item: string) => item !== "$self")[0];
				writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				writer.writeLine(`iv_principal_property = '${principalProperty}'`);
				writer.writeLine(`iv_dependent_property = '${dependentProperty}'`);
				writer.decreaseIndent().writeLine(`).`);
			}

			// Create Association Set
			let getEntitySetName = (entity: entity): string => (<any>entity)?.["@segw.set.name"] ?? `${ABAPUtils.getABAPName(entity)}Set`;
			let associationSetName = (<any>association)?.["@segw.set.name"] ?? `${associationName}_set`;
			writer.writeLine(`assoc_set->create_association_set(`).increaseIndent();
			writer.writeLine(`iv_association_set_name = '${associationSetName}'`);
			writer.writeLine(`iv_left_entity_set_name = '${getEntitySetName(association.parent)}'`);
			writer.writeLine(`iv_right_entity_set_name = '${getEntitySetName(association._target)}'`);
			writer.writeLine(`iv_association_name = '${associationName}'`);
			writer.decreaseIndent().writeLine(').');

			writer.writeLine();

			// Since we worked both ways, we can marked this as 'complete'.
			visitedNodes.push({ 
				assocationName: associationName, 
				parent: association.parent, 
				target: association._target 
			});
			visitedNodes.push({ 
				assocationName: associationName,
				parent: association._target, 
				target: association.parent 
			});
		}

		for(let association of associations){
			let propertyName = association?.["@segw.name"] ?? association.name;
			let abapName = association?.["@segw.abap.name"] ?? association.name;
			let associationName = visitedNodes.find(node => node.parent === association.parent)?.assocationName;
			writer.writeLine(`entity_type = model->get_entity_type( iv_entity_name = '${ABAPUtils.getABAPName(association.parent)}' ).`);
			writer.writeLine(`nav_property = entity_type->create_navigation_property(`).increaseIndent();
			writer.writeLine(`iv_property_name = '${propertyName}'`);
			writer.writeLine(`iv_abap_fieldname = '${abapName}'`);
			writer.writeLine(`iv_association_name = '${associationName}'`);
			writer.decreaseIndent().writeLine(`).`).writeLine();
		}

		let code = writer.generate().split('\n');
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "define_associations",
			isRedefinition: true,
			code: code
		});
	}

	private _processActions(service: any){
		let actions = {};

		Object.keys(service?.actions ?? {}).forEach((action: any) => {
			(<any>actions)[`${action}`] = service?.actions[action];
		});

		(Object.values(service.entities) ?? []).forEach((entity: any) => {
			Object.keys(entity?.actions ?? {}).forEach((action: any) => {
				(<any>actions)[`${ABAPUtils.getABAPName(entity)}.${action}`] = entity?.actions[action];
			});
		});

		this._writeActions(actions)
	}

	private _writeActions(actions: any): void {
		let writer = new CodeWriter();

		let getActionName = (action: any, actionKey: string): string => {
			if(action?.["@segw.name"]){
				return action?.["@segw.name"];
			}
			return actionKey;
		}

		writer.writeLine("data action type ref to /iwbep/if_mgw_odata_action.");
		writer.writeLine("data parameter type ref to /iwbep/if_mgw_odata_parameter.");
		writer.writeLine();

		for(let actionKey of Object.keys(actions)){
			let action = actions[actionKey];
			let actionName = ABAPUtils.getABAPName(getActionName(action, actionKey)).replace(/\./g, '_');

			let method = (<any>action?.["@segw.action.method"]) ?? "POST";

			writer.writeLine(`action = me->model->create_action( '${actionName}' ).`);
			writer.writeLine(`action->set_http_method( '${method}' ).`);
			
			if(action?.parent){
				writer.writeLine(`action->set_action_for( '${ABAPUtils.getABAPName(action?.parent)}' ).`);
			}
			writer.writeLine();

			for(let param of action?.params ?? []){
				let paramName = (<any>param?.["@segw.name"]) ?? ABAPUtils.getABAPName(param);
				let abapName = (<any>param?.["@segw.abap.name"]) ?? ABAPUtils.getABAPName(param);
				writer.writeLine(`parameter = action->create_input_parameter( iv_paramenter_name = '${paramName}' iv_abap_fieldname = '${abapName}' ).`)
				writer.writeLine(this._getSetEDMTypeString(param, "parameter->/iwbep/if_mgw_odata_property~"));
			}

			if(action?.params){
				let inputType = this._class.publicSection?.types?.find((type: any) => {
					return type.name === `t_${actionName}_input`;
				});
				if(!inputType){
					LOG.warn(`Could not find type 't_${actionName}_input' for action ${actionName}` );
					return;
				}
				let inputName = ("structure" in inputType) ? inputType.structure?.name : inputType.name;
				writer.writeLine(`action->bind_input_structure( '${this._class.name}=>${inputName}' ).`);
			}


			let multiplicity = ("items" in action?.returns) ? Cardinality.cardinality_1_1 : Cardinality.cardinality_0_n;
			writer.writeLine(`action->set_return_multiplicity( '${multiplicity}' ).`);

			// Array
			let returnEntity = Object.getPrototypeOf(action?.returns);
			if("items" in action?.returns){
				returnEntity = Object.getPrototypeOf(action.returns.items);
			}
			writer.writeLine(`action->set_return_entity_type( '${ABAPUtils.getABAPName(returnEntity)}' ).`);
			writer.writeLine();
		}

		let code = writer.generate().split('\n');
		this._class?.protectedSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: `define_actions`,
			code: code
		});
	}
}