import IFCodeGenerator from "./IFCodeGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator, { 
	ABAPClass, 
	ABAPClassSectionType,
	ABAPMethod, 
	ABAPMethodType, 
	ABAPParameterReferenceType
} from "./ABAPGenerator";
import CodeWriter from "./CodeWriter";

import { entity } from "@sap/cds";

export default class ModelProviderClassGeneratorV4 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { 
		name: "",
		interfaces: [],
		publicSection: {
			type: ABAPClassSectionType.PUBLIC,
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

	public constructor(){
		this._class.interfaces?.push("/iwbep/cl_v4_abs_model_prov");

		this._class?.publicSection?.methods?.push({
			type: ABAPMethodType.MEMBER,
			name: "/iwbep/if_v4_mp_basic~define",
			isRedefinition: true,
			code: this._entityDefineMethods.map((method) => `me->${method}( io_model ).`),
		});
	}

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);
		return generator.generate();
	}

	public setClassName(name: string): void { this._class.name = name; }

	public addEntity(entity: entity): void {
		let defineEntityMethod: ABAPMethod = {
			type: ABAPMethodType.MEMBER,
			name: `define_${entity.name}`,
			importing: [
				{
					name: "io_model",
					referenceType: ABAPParameterReferenceType.TYPE_REF,
					type: "/iwbep/if_v4_med_model"
				}
			]
		};

		let writer = new CodeWriter();
		writer.writeLine("DATA:").increaseIndent();
		writer.writeLine("primative_properties TYPE /iwbep/if_v4_med_element=>ty_t_med_prim_property,");
		writer.writeLine("entity_set TYPE REF TO /iwbep/if_v4_med_entity_set,");
		writer.writeLine("nav_property TYPE REF TO /iwbep/if_v4_med_nav_prop,");
		writer.writeLine("entity_type TYPE REF TO /iwbep/if_v4_med_entity_type.");
		// TODO: Create Types
		// writer.writeLine(`referenced_entity TYPE ${this._class.name}~${this._class.publicSection.types[entity.name]}`);
		writer.decreaseIndent().writeLine().writeLine();

		writer.writeLine(`" Create Entity Type`);
		writer.writeLine("entity_type = io_model->create_entity_type_by_struct( ").increaseIndent();
		writer.writeLine("EXPORTING").increaseIndent();
		writer.writeLine(`iv_entity_type_name = ${entity.name}`);
		writer.writeLine(`is_structure = referenced_entity`);
		writer.writeLine(`iv_add_conv_to_prim_props = abap_true`);
		writer.writeLine(`iv_add_f4_help_to_prim_props = abap_true`);
		writer.writeLine(`iv_gen_prim_props = abap_true`);
		writer.decreaseIndent();
		writer.decreaseIndent().writeLine(").").writeLine();

		writer.writeLine(`" Set External EDM name for entity type`);
		writer.writeLine(`entity_type->set_edm_name( |${entity.name}| ).`).writeLine();

		writer.writeLine(`" Rename External EDM names so CamelCase notation is used`);
		writer.writeLine(`entity_type->get_primative_properties( IMPORTING et_property = primative_properties ).`);
		writer.writeLine(`LOOP AT primative_properties INTO DATA(primative_property).`).increaseIndent();
		writer.writeLine(`primative_properties->set_edm_name( to_mixed( val = primative_property->get_internal_name( ) ) ).`).decreaseIndent();
		writer.writeLine(`ENDLOOP.`).writeLine();

		writer.writeLine(`" Set Key Fields`);

		writer.writeLine(`" Create Navigation Property`);

		writer.writeLine(`" Create Entity Set`);
		writer.writeLine(`entity_set = entity_type->create_entity_set( '${entity.name}' ).`);
		writer.writeLine(`entity_set->set_edm_name( ).`);

		writer.writeLine(`" Add the binding of the navigation path`);
		writer.writeLine();

		defineEntityMethod.code = writer.generate().split("\n");
		this._entityDefineMethods.push(defineEntityMethod.name);
		this._class?.protectedSection?.methods?.push(defineEntityMethod);
	};
}