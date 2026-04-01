import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: SEGW extension class generation", () => {
	test("impl mode emits base and extension classes for OData V2", () => {
		const catalogCds = `
			@segw.name: 'ZEXTV2'
			service CatalogService {
				entity Products {
					key ID: UUID;
					name: String;
				};
				action resetAll() returns Boolean;
			};
		`;

		const csn = cds.linked(cds.parse.cdl(catalogCds));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "2", impl: true }));
		const files = outputs.map(([, meta]) => (meta as any).file);

		expect(outputs).toHaveLength(4);
		expect(files).toEqual(expect.arrayContaining([
			"ZCL_ZEXTV2_MPC.abap",
			"ZCL_ZEXTV2_DPC.abap",
			"ZCL_ZEXTV2_MPC_EXT.abap",
			"ZCL_ZEXTV2_DPC_EXT.abap",
		]));

		const mpcExt = outputs.find(([, meta]) => (meta as any).file === "ZCL_ZEXTV2_MPC_EXT.abap")?.[0] as string;
		const dpcExt = outputs.find(([, meta]) => (meta as any).file === "ZCL_ZEXTV2_DPC_EXT.abap")?.[0] as string;

		expect(mpcExt).toContain("CLASS ZCL_ZEXTV2_MPC_EXT DEFINITION");
		expect(mpcExt).toContain("INHERITING FROM ZCL_ZEXTV2_MPC");
		expect(mpcExt).toContain("METHODS define REDEFINITION.");
		expect(mpcExt).toContain("METHODS get_last_modified REDEFINITION.");
		expect(mpcExt).toContain("METHODS define_Products REDEFINITION.");
		expect(mpcExt).toContain("METHOD define.");
		expect(mpcExt).toContain("super->define( ).");

		expect(dpcExt).toContain("CLASS ZCL_ZEXTV2_DPC_EXT DEFINITION");
		expect(dpcExt).toContain("INHERITING FROM ZCL_ZEXTV2_DPC");
		expect(dpcExt).toContain("METHODS /iwbep/if_mgw_appl_srv_runtime~get_entity_set REDEFINITION.");
		expect(dpcExt).toContain("METHODS Products_get_entity_set REDEFINITION.");
		expect(dpcExt).toContain("METHODS execute_resetAll REDEFINITION.");
		expect(dpcExt).toContain("METHOD Products_get_entity_set.");
		expect(dpcExt).toContain("entity_set = super->Products_get_entity_set(");
	});

	test("segw-ext mode emits only extension classes for OData V4", () => {
		const catalogCds = `
			@segw.name: 'ZEXTV4'
			service CatalogService {
				type Address { street: String; city: String; }
				entity Products {
					key ID: UUID;
					name: String;
					shipTo: Address;
				};
				action resetAll() returns Boolean;
			};
		`;

		const csn = cds.linked(cds.parse.cdl(catalogCds));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4", impl: true, extOnly: true }));
		const files = outputs.map(([, meta]) => (meta as any).file);

		expect(outputs).toHaveLength(2);
		expect(files).toEqual(["ZCL_ZEXTV4_MPC_EXT.abap", "ZCL_ZEXTV4_DPC_EXT.abap"]);

		const mpcExt = outputs.find(([, meta]) => (meta as any).file === "ZCL_ZEXTV4_MPC_EXT.abap")?.[0] as string;
		const dpcExt = outputs.find(([, meta]) => (meta as any).file === "ZCL_ZEXTV4_DPC_EXT.abap")?.[0] as string;

		expect(mpcExt).toContain("CLASS ZCL_ZEXTV4_MPC_EXT DEFINITION");
		expect(mpcExt).toContain("INHERITING FROM ZCL_ZEXTV4_MPC");
		expect(mpcExt).toContain("METHODS /iwbep/if_v4_mp_basic~define REDEFINITION.");
		expect(mpcExt).toContain("METHODS define_complex REDEFINITION.");
		expect(mpcExt).toContain("METHODS define_Products REDEFINITION.");
		expect(mpcExt).toContain("super->/iwbep/if_v4_mp_basic~define(");

		expect(dpcExt).toContain("CLASS ZCL_ZEXTV4_DPC_EXT DEFINITION");
		expect(dpcExt).toContain("INHERITING FROM ZCL_ZEXTV4_DPC");
		expect(dpcExt).toContain("METHODS /iwbep/if_v4_dp_basic~read_entity_list REDEFINITION.");
		expect(dpcExt).toContain("METHODS Products_list REDEFINITION.");
		expect(dpcExt).toContain("METHODS Products_target_ref REDEFINITION.");
		expect(dpcExt).toContain("METHODS execute_resetAll REDEFINITION.");
		expect(dpcExt).toContain("super->/iwbep/if_v4_dp_basic~read_entity_list(");
	});
});
