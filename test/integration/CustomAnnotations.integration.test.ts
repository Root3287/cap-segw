import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: custom @segw annotations", () => {
	test("honors service, association, and navigation overrides", () => {
		const model = `
			@segw.name: 'ZANNOCUST'
			service CustomAnno {
				entity Parent {
					key ID: Integer;
				};

				entity Child {
					key ID: Integer;
					parentID: Integer;
					@segw.association.name: 'CUST_ASSOC'
					@segw.set.name: 'CUST_ASSOC_SET'
					@segw.name: 'ParentNav'
					@segw.abap.name: 'PARENT_NAV'
					parent: Association to Parent on parent.ID = $self.parentID;
				};
			};
		`;

		const csn = cds.linked(cds.parse.cdl(model));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "2" }));
		const files = outputs.map(([, meta]) => meta.file);

		expect(files).toEqual(
			expect.arrayContaining(["ZCL_ZANNOCUST_MPC.abap", "ZCL_ZANNOCUST_DPC.abap"])
		);

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0] as string;
		expect(mpc).toContain("iv_association_name = |CUST_ASSOC|");
		expect(mpc).toContain("iv_association_set_name = 'CUST_ASSOC_SET'");

		// Navigation property naming overrides
		expect(mpc).toContain("iv_property_name = 'ParentNav'");
		expect(mpc).toContain("iv_abap_fieldname = 'PARENT_NAV'");
		expect(mpc).toContain("iv_association_name = 'CUST_ASSOC'");
	});
});
