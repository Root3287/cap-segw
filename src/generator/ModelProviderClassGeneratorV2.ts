import IFCodeGenerator from "./IFCodeGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import { 
	Class as ABAPClass, 
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod, 
	MethodType as ABAPMethodType, 
	ParameterReferenceType as ABAPParameterReferenceType
} from "../types/abap";
import { Primitive as CDSPrimitive } from "../types/cds";
import CodeWriter from "./CodeWriter";

import { entity, csn } from "@sap/cds";

export default class ModelProviderClassGeneratorV2 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		inheriting: ["/iwbep/cl_mgw_push_abs_model"],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
			structures: [],
			tables: [],
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
	private _namespace: string = "";

	public constructor(){
	}

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);
		
		this._class?.publicSection?.structures?.push({
			name: "ts_text_element",
			parameters: [
				{ name: "artifact_name", referenceType: ABAPParameterReferenceType.TYPE, type: "c", length: 40 },
				{ name: "artifact_type", referenceType: ABAPParameterReferenceType.TYPE, type: "c", length: 4 },
				{ name: "parent_artifact_name", referenceType: ABAPParameterReferenceType.TYPE, type: "c", length: 40 },
				{ name: "parent_artifact_name", referenceType: ABAPParameterReferenceType.TYPE, type: "c", length: 4 },
				{ name: "text_symbol", referenceType: ABAPParameterReferenceType.TYPE, type: "textpoolky" },
			]
		});
		this._class?.publicSection?.tables?.push({
			structure: { 
				name: "tt_text_elements", 
				referenceType: ABAPParameterReferenceType.TYPE_STANDARD_TABLE, 
				type: "ts_text_element" 
			},
			key: "with key text_symbol"
		});

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "LOAD_TEXT_ELEMENTS",
			isFinal: true,
			returning: {
				name: "rt_text_elements",
				referenceType: ABAPParameterReferenceType.TYPE,
				type: "tt_text_elements",
			},
			raising: [ "/iwbep/cx_mgw_med_exception" ],
			code: [
				// TODO Move to some place else, but for now this is all the method does.
				"APPEND VALUE #(",
				"\tartifact_name = ''",
				"\tartifact_type = ''",
				"\tparent_artifact_name = ''",
				"\tparent_artifact_type = ''",
				"\ttext_symbol = ''",
				") to rt_text_elements."
			]
		});

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "define",
			isRedefinition: true,
			code: [
				`model->set_schema_namespace( |${this._namespace}| ).`,
				"",
				...this._entityDefineMethods.map((method) => `me->${method}( io_model ).`),
				"me->define_associations( ).",
			],
		});

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "get_last_modified",
			isRedefinition: true,
			code: [
				// TODO: UPDATE DATE TIME
				"CONSTANTS: lc_gen_date_time TYPE VALUE '20250919151019'.",
				"rv_last_modified = super->get_last_modified( ).",
				"IF rv_last_modified LT lc_gen_date_time.",
				"\trv_last_modified = lc_gen_date_time.",
				"ENDIF."
			]
		})

		return generator.generate();
	}

	public setClassName(name: string): void { this._class.name = name; }

	public addEntity(entity: entity): void {
		let splitNamespace = entity.name.split(".");
		let entityName = (<any>entity)?.["@segw.name"] ?? splitNamespace[splitNamespace.length-1];
		
		let defineEntityMethod: ABAPMethod = {
			type: ABAPMethodType.MEMBER,
			name: `define_${entityName}`,
			raising: [ "/iwbep/cx_mgw_med_exception"]
		};

		let writer = new CodeWriter();
		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("annotation TYPE /iwbep/if_mgw_odata_annotation,");
		writer.writeLine("entity_type TYPE REF TO /iwbep/if_mgw_odata_entity_typ,");
		writer.writeLine("complex_type TYPE REF TO /iwbep/if_mgw_odata_cmplx_type,");
		writer.writeLine("property TYPE REF TO /iwbep/if_mgw_odata_property,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if/mgw_odata_entity_set.");
		// TODO: Create Types
		// writer.writeLine(`referenced_entity TYPE ${this._class.name}~${this._class.publicSection.types[entity.name]}`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine("entity_type = io_model->create_entity_type( ").increaseIndent();
		writer.writeLine(`iv_entity_type_name = ${entity.name}`);
		writer.writeLine(`is_def_entity_set = abap_false`);
		writer.decreaseIndent().writeLine(").").writeLine();

		// Loop over properties
		writer.writeLine("property = entity_type->create_property(").increaseIndent();
		writer.writeLine("iv_property_name = ''");
		writer.writeLine("iv_abap_fieldname = ''");
		writer.decreaseIndent().writeLine(").");
		// writer.writeLine("property->set_is_key( ).");
		
		// Types
		// writer.writeLine("property->set_type_edm_datetime( ).");
		// writer.writeLine("property->set_type_edm_string( ).");
		// writer.writeLine("property->set_type_edm_boolean( ).");
		// writer.writeLine("property->set_type_edm_decimal( ).");
		
		// Main OData Annotations
		// writer.writeLine("property->set_precison( iv_precision = ).");
		// writer.writeLine("property->set_maxlength( iv_max_length = ).");
		// writer.writeLine("property->set_creatable( abap_false ).");
		// writer.writeLine("property->set_updatable( abap_false ).");
		// writer.writeLine("property->set_nullable( abap_false ).");
		// writer.writeLine("property->set_sortable( abap_true ).");
		// writer.writeLine("property->set_filterable( abap_false ).");
		
		// TODO: Annotation
		// writer.writeLine("property->/iwbep/if_mgw_odata_annotatabl~create_annotation( 'sap' )->add(").increaseIndent();
	    // writer.writeLine("EXPORTING").increaseIndent();
        // writer.writeLine("iv_key = 'unicode'");
        // writer.writeLine("iv_value = 'false'");
        // writer.decreaseIndent().writeLine(").");

        // TODO: Labels
        // lo_property->set_label_from_text_element( iv_text_element_symbol = '033' iv_text_element_container = gc_incl_name ). 
		
		writer.writeLine();
		writer.writeLine("entity_set = entity_type->create_entity_set( '' ).").writeLine();
		writer.writeLine("entity_set->set_creatable( abap_false ).");
		writer.writeLine("entity_set->set_updatable( abap_false ).");
		writer.writeLine("entity_set->set_deletable( abap_false ).");
		writer.writeLine();
		writer.writeLine("entity_set->set_pageable( abap_true ).");
		writer.writeLine("entity_set->set_addressable( abap_false ).");
		writer.writeLine("entity_set->set_has_ftxt_search( abap_false ).");
		writer.writeLine("entity_set->set_subscribable( abap_false ).");
		writer.writeLine("entity_set->set_filter_required( abap_false ).");

		writer.writeLine();

		defineEntityMethod.code = writer.generate().split("\n");
		this._entityDefineMethods.push(defineEntityMethod.name);
		this._class?.protectedSection?.methods?.push(defineEntityMethod);
	};
}