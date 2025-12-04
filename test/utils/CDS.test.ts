import { CDS } from "../../src/utils/CDS";
import { Primitive as CDSPrimitive } from "../../src/types/cds";
import { Primitive as ABAPPrimitive } from "../../src/types/abap";
import { Primitive as EDMPrimitive } from "../../src/types/edm";

describe("CDS utils", () => {
	describe("cds2abap()", () => {
		test.each([
			[CDSPrimitive.UUID,        ABAPPrimitive.UUID],
			[CDSPrimitive.Boolean,     ABAPPrimitive.BOOLEAN],
			[CDSPrimitive.Integer,     ABAPPrimitive.INTEGER],
			[CDSPrimitive.Int16,       ABAPPrimitive.INT16],
			[CDSPrimitive.Int32,       ABAPPrimitive.INT32],
			[CDSPrimitive.Int64,       ABAPPrimitive.INT64],
			[CDSPrimitive.UInt8,       ABAPPrimitive.UINT8],
			[CDSPrimitive.Decimal,     ABAPPrimitive.DECIMAL],
			[CDSPrimitive.Double,      ABAPPrimitive.DOUBLE],
			[CDSPrimitive.Date,        ABAPPrimitive.DATE],
			[CDSPrimitive.Time,        ABAPPrimitive.TIME],
			// Note: implementation maps both DateTime and Timestamp to TIMESTAMP
			[CDSPrimitive.DateTime,    ABAPPrimitive.TIMESTAMP],
			[CDSPrimitive.Timestamp,   ABAPPrimitive.TIMESTAMP],
			[CDSPrimitive.String,      ABAPPrimitive.STRING],
			[CDSPrimitive.LargeString, ABAPPrimitive.STRING],
			[CDSPrimitive.Binary,      ABAPPrimitive.BINARY],
			[CDSPrimitive.LargeBinary, ABAPPrimitive.BINARY],
		])("maps %s to ABAP %s", (cds, expected) => {
			expect(CDS.cds2abap(cds)).toBe(expected);
		});

		test("unhandled CDS primitive returns null", () => {
			// Cast a bogus value to the enum type to hit the default branch
			expect(CDS.cds2abap(9999 as unknown as CDSPrimitive)).toBeNull();
		});
	});

	describe("cds2edm()", () => {
		test.each([
			[CDSPrimitive.UUID,        EDMPrimitive.Guid],
			[CDSPrimitive.Boolean,     EDMPrimitive.Boolean],
			[CDSPrimitive.Integer,     EDMPrimitive.Int32],   // per implementation choice
			[CDSPrimitive.Int16,       EDMPrimitive.Int16],
			[CDSPrimitive.Int32,       EDMPrimitive.Int32],
			[CDSPrimitive.Int64,       EDMPrimitive.Int64],
			[CDSPrimitive.UInt8,       EDMPrimitive.Byte],
			[CDSPrimitive.Decimal,     EDMPrimitive.Decimal],
			[CDSPrimitive.Double,      EDMPrimitive.Double],
			[CDSPrimitive.Date,        EDMPrimitive.Date],
			[CDSPrimitive.Time,        EDMPrimitive.Time],
			// Implementation falls through to DateTimeOffset for both DateTime and Timestamp
			[CDSPrimitive.DateTime,    EDMPrimitive.DateTimeOffset],
			[CDSPrimitive.Timestamp,   EDMPrimitive.DateTimeOffset],
			[CDSPrimitive.String,      EDMPrimitive.String],
			[CDSPrimitive.LargeString, EDMPrimitive.String],
			[CDSPrimitive.Binary,      EDMPrimitive.Binary],
			[CDSPrimitive.LargeBinary, EDMPrimitive.Binary],
		])("maps %s to EDM %s", (cds, expected) => {
			expect(CDS.cds2edm(cds)).toBe(expected);
		});

		test("unhandled CDS primitive returns null", () => {
			expect(CDS.cds2edm(-1 as unknown as CDSPrimitive)).toBeNull();
		});

		test("DateTime specifically maps to DateTimeOffset due to fall-through", () => {
			expect(CDS.cds2edm(CDSPrimitive.DateTime)).toBe(EDMPrimitive.DateTimeOffset);
		});
	});
});
