import EntityMPCV4Writer from "../../../src/writers/EntityMPCV4Writer";

jest.mock("@sap/cds", () => {
	const warn = jest.fn();
	return {
		__esModule: true,
		default: { log: () => ({ warn }) },
		log: () => ({ warn }),
		__warnSpy: warn,
	};
});

describe("EntityMPCV4Writer entity naming and warnings", () => {
	const { __warnSpy: warnSpy } = require("@sap/cds");

	beforeEach(() => {
		warnSpy.mockClear();
	});

	test("logs and normalizes unsupported characters when no @segw.name override", () => {
		const csn: any = {
			name: "Service.Bad.Name",
			_service: { name: "Service" },
			elements: {
				ID: { name: "ID", type: "cds.String", key: true },
			},
		};

		const csdl: any = { ID: {} };

		const writer = new EntityMPCV4Writer();
		writer.setEntity(csn, csdl);
		writer.setCompilerInfo({ csdl: { a:{}, b:{}, c:{}, Service:{} }, csn: {} } as any);

		const abap = writer.generate();

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("contains characters not supported by SEGW")
		);
		expect(abap).toContain("create_entity_type( 'BAD_NAME' )");
		expect(abap).toContain("set_edm_name( |Bad_Name| )");
	});

	test("uses @segw.name and avoids warnings", () => {
		const csn: any = {
			name: "Service.Bad.Name",
			["@segw.name"]: "CleanEntity",
			_service: { name: "Service" },
			elements: {
				ID: { name: "ID", type: "cds.String", key: true },
			},
		};

		const csdl: any = { ID: {} };

		const writer = new EntityMPCV4Writer();
		writer.setEntity(csn, csdl);
		writer.setCompilerInfo({ csdl: { a:{}, b:{}, c:{}, Service:{} }, csn: {} } as any);

		const abap = writer.generate();

		expect(warnSpy).not.toHaveBeenCalled();
		expect(abap).toContain("create_entity_type( 'CLEANENTITY' )");
		expect(abap).toContain("set_edm_name( |CleanEntity| )");
	});
});
