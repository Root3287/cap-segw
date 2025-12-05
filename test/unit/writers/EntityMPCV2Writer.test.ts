import EntityMPCV2Writer from "../../../src/writers/EntityMPCV2Writer";
import { Primitive as CDSPrimitive } from "../../../src/types/cds";

describe("EntityMPCV2Writer @segw annotations", () => {
	test("applies @segw name overrides and property flags", () => {
		const entity: any = {
			name: "Service.Product",
			["@segw.abap.type"]: "ZPRODUCT_ABAP",
			elements: [
				{ name: "ID", key: true, type: CDSPrimitive.UUID },
				{
					name: "code",
					type: CDSPrimitive.String,
					length: 40,
					["@segw.name"]: "ExternalCode",
					["@segw.abap.name"]: "ABAP_CODE",
					["@segw.sortable"]: true,
					["@segw.filterable"]: true,
					["@segw.conversion"]: true,
				},
			],
		};

		const writer = new EntityMPCV2Writer();
		writer.setEntity(entity);
		writer.setClassName("ZCL_TEST_MPC");

		const abap = writer.generate();

		// Property naming and ABAP field override
		expect(abap).toContain("iv_property_name = 'ExternalCode'");
		expect(abap).toContain("iv_abap_fieldname = 'ABAP_CODE'");

		// Custom flags mapped to setter calls
		expect(abap).toContain("property->set_sortable( abap_true ).");
		expect(abap).toContain("property->set_filterable( abap_true ).");
		expect(abap).toContain("property->set_no_conversion( abap_false ).");

		// Binding honors @segw.abap.type
		expect(abap).toContain("iv_bind_conversion = abap_true");
	});
});
