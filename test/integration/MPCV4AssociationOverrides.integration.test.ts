import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("MPCV4 Association Naming", () => {
	test("applies @segw.abap.name to associations and generated FK properties", () => {
		const model = `
			service Test {
				entity Parents {
					key super_long_name_that_will_break_abap: Integer;
					key client: String;
				};

				type Parent: Association to Parents;

				entity Child {
					key ID: Integer;
					key client: String;

					@segw.abap.name: 'ALTNAME'
					alt_name_that_is_long: String;
					
					@segw.abap.name: 'PARENT'
					parent_entity_that_is_also_too_long: Parent;
				};
			};
		`;

		const csn = cds.linked(cds.parse.cdl(model));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0] as string;
		expect(mpc).toBeTruthy();

		// Association name is derived from child entity (owner) and target
		expect(mpc).toContain("entity_type->create_prim_property( 'PARENT' ).");
		expect(mpc).toContain("primitive_property->set_edm_name( 'parent_entity_that_is_also_too_long_super_long_name_that_will_break_abap' ).");

		// Primitive properties honor @segw.abap.name overrides
		expect(mpc).toContain("primitive_property = entity_type->create_prim_property( 'ALTNAME' ).");
		expect(mpc).toContain("primitive_property->set_edm_name( 'alt_name_that_is_long' ).");
	});
});
