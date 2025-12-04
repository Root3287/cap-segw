import cds from "@sap/cds";
import segwCompiler from "../src";

describe("Integration: CAP -> SEGW MPC V4 generation", () => {
	test("Application service generates V4 MPC metadata", () => {
		const catalogCds = `
			@segw.name: 'ZV4MPC'
			service CatalogService {
				type Address { street: String; city: String; }
				entity Products {
					key ID: UUID;
					name: String(120);
					stock: Integer;
					shipTo: Address;
				};
				action resetAll() returns Boolean;
			};
		`;

		const csn = cds.linked(cds.parse.cdl(catalogCds));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const mpcEntry = outputs.find(([, meta]) => meta.file.includes("_MPC"));

		expect(outputs).toHaveLength(2);
		expect(mpcEntry?.[1].file).toBe("ZCL_ZV4MPC_MPC.abap");

		const mpc = String(mpcEntry?.[0]);

		expect(mpc).toContain("INHERITING FROM /iwbep/cl_v4_abs_model_prov");
		expect(mpc).toContain("METHOD /iwbep/if_v4_mp_basic~define.");
		expect(mpc).toContain("io_model->set_schema_namespace( 'CatalogService' ).");

		expect(mpc).toContain("TYPES: BEGIN OF t_Products");
		expect(mpc).toContain("name TYPE STRING");
		expect(mpc).toContain("shipTo_street TYPE STRING");

		expect(mpc).toContain("entity_type = model->create_entity_type( 'PRODUCTS' ).");
		expect(mpc).toContain("primitive_property->set_edm_name( 'ID' ).");
		expect(mpc).toContain("primitive_property->set_is_key( ).");
		expect(mpc).toContain("primitive_property->set_max_length( '120' ).");
		expect(mpc).toContain("entity_set = entity_type->create_entity_set( 'PRODUCTS' ).");

		expect(mpc).toContain("complex_type = model->create_complex_type( 'ADDRESS' ).");
		expect(mpc).toContain("complex_type->set_edm_name( |Address| ).");
		expect(mpc).toContain("primitive_property = complex_type->create_prim_property( 'STREET' ).");

		expect(mpc).toContain("action = model->create_action( |RESETALL| ).");
		expect(mpc).toContain("action->set_edm_name( |resetAll| ).");
		expect(mpc).toContain("action_return->set_primitive_type( 'Edm.Boolean' ).");
	});
});
