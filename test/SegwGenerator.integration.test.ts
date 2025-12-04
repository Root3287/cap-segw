import path from "path";
import cds from "@sap/cds";
import segwCompiler from "../src";

describe("Integration: CAP -> SEGW ABAP generation", () => {
	test("Hotel service produces MPC and DPC classes with expected names", async () => {
		const modelRoot = path.join(__dirname, "cds");
		const csn = await cds.load(["srv/Hotel.cds"], { root: modelRoot });

		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const files = outputs.map(([, meta]) => meta.file);

		expect(files).toEqual(
			expect.arrayContaining([
				"ZCL_ZODATAV4_TEST_TIM_01_MPC.abap",
				"ZCL_ZODATAV4_TEST_TIM_01_DPC.abap",
			])
		);
		expect(outputs).toHaveLength(2);

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0];
		const dpc = outputs.find(([, meta]) => meta.file.includes("_DPC"))?.[0];

		expect(mpc).toContain("CLASS ZCL_ZODATAV4_TEST_TIM_01_MPC DEFINITION");
		expect(mpc).toContain("METHOD /iwbep/if_v4_mp_basic~define.");

		expect(dpc).toContain("CLASS ZCL_ZODATAV4_TEST_TIM_01_DPC DEFINITION");
		// DPC generator emits CRUDQ stubs; ensure interface redefinitions are present
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_entity_list.");
		expect(dpc).toContain("METHOD execute_getNearestHotel.");
	});
});
