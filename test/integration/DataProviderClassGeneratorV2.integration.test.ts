import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: Data Provider class generation V2", () => {
	test("OData V2 data provider emits CRUD and action stubs", () => {
		const catalogCds = `
			@segw.name: 'ZV2DPC'
			service CatalogService {
				entity Products {
					key ID: UUID;
					name: String;
				};
				action resetAll() returns Boolean;
			};
		`;

		const csn = cds.linked(cds.parse.cdl(catalogCds));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "2" }));
		const dpc = outputs.find(([, meta]) => meta.file.includes("_DPC"))?.[0] as string;

		expect(outputs).toHaveLength(2);
		expect(dpc).toContain("CLASS ZCL_ZV2DPC_DPC DEFINITION");

		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~get_entity_set.");
		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~get_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~update_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~create_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~delete_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_mgw_appl_srv_runtime~execute_action.");

		expect(dpc).toContain("METHOD Products_get_entity_set.");
		expect(dpc).toContain("METHOD Products_get_entity.");
		expect(dpc).toContain("METHOD Products_create_entity.");
		expect(dpc).toContain("METHOD Products_update_entity.");
		expect(dpc).toContain("METHOD Products_delete_entity.");
		expect(dpc).toContain("METHOD execute_resetAll.");
		expect(dpc).toContain("WHEN 'resetAll'.");
	});
});
