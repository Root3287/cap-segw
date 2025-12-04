import cds from "@sap/cds";
import segwCompiler from "../src";

describe("Integration: Data Provider class generation V4", () => {
	test("OData V4 data provider redefines CRUDQ and action handlers", () => {
		const catalogCds = `
			@segw.name: 'ZV4DPC'
			service CatalogService {
				entity Products {
					key ID: UUID;
					name: String;
				};
				action resetAll() returns Boolean;
			};
		`;

		const csn = cds.linked(cds.parse.cdl(catalogCds));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const dpc = outputs.find(([, meta]) => meta.file.includes("_DPC"))?.[0] as string;

		expect(outputs).toHaveLength(2);
		expect(dpc).toContain("CLASS ZCL_ZV4DPC_DPC DEFINITION");

		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_entity_list.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~create_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~update_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~delete_entity.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~execute_action.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~execute_function.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_ref_target_key_data.");
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_ref_target_key_data_list.");

		expect(dpc).toContain("METHOD Products_list.");
		expect(dpc).toContain("METHOD Products_create.");
		expect(dpc).toContain("METHOD Products_read.");
		expect(dpc).toContain("METHOD Products_update.");
		expect(dpc).toContain("METHOD Products_delete.");
		expect(dpc).toContain("METHOD Products_target_ref.");
		expect(dpc).toContain("METHOD Products_target_ref_l.");
		expect(dpc).toContain("WHEN 'PRODUCTS'.");
		expect(dpc).toContain("WHEN 'RESETALL'.");
		expect(dpc).toContain("METHOD execute_resetAll.");
	});
});
