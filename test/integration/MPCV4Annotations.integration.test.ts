import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: MPC V4 custom @segw annotations", () => {
	test("respects service @segw.name and emits expected MPC constructs", () => {
		const model = `
@segw.name: 'ZV4ANN'
service AnnotService {
	@segw.set.name: 'PRODUCTS_CUSTOM'
	entity Product {
		key ID: UUID;
		@segw.name: 'ExternalCode'
		@segw.abap.name: 'ABAP_CODE'
		code: String(40);
	};

	@segw.name: 'DoIt'
	@segw.abap.name: 'DOIT_ABAP'
	action doSomething() returns Boolean;
};
`;

		const csn = cds.linked(cds.parse.cdl(model));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const files = outputs.map(([, meta]) => meta.file);

		expect(files).toEqual(expect.arrayContaining(["ZCL_ZV4ANN_MPC.abap", "ZCL_ZV4ANN_DPC.abap"]));

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0] as string;

		// Entity set override + EDM name
		expect(mpc).toContain("entity_set = entity_type->create_entity_set( 'PRODUCTS_CUSTOM' ).");
		expect(mpc).toContain("entity_set->set_edm_name( |PRODUCTS_CUSTOM| ).");

		// Property naming overrides
		expect(mpc).toContain("primitive_property = entity_type->create_prim_property( 'ABAP_CODE' ).");
		expect(mpc).toContain("primitive_property->set_edm_name( 'ExternalCode' ).");

		// Action ABAP/EDM overrides
		expect(mpc).toContain("action = model->create_action( |DOIT_ABAP| ).");
		expect(mpc).toContain("action->set_edm_name( |DoIt| ).");
	});
});
