import { EDM } from "../../src/utils/EDM";
import { Primitive as EDMPrimitive } from "../../src/types/edm";
import { Primitive as ABAPPrimitive } from "../../src/types/abap";

describe("EDM utils", () => {
	describe("edm2abap()", () => {
		test.each([
			[EDMPrimitive.Guid, ABAPPrimitive.UUID],
			[EDMPrimitive.Boolean, ABAPPrimitive.BOOLEAN],
			[EDMPrimitive.Int32, ABAPPrimitive.INTEGER],
			[EDMPrimitive.Int16, ABAPPrimitive.INT16],
			[EDMPrimitive.Int64, ABAPPrimitive.INT64],
			[EDMPrimitive.Byte, ABAPPrimitive.UINT8],
			[EDMPrimitive.Decimal, ABAPPrimitive.DECIMAL],
			[EDMPrimitive.Double, ABAPPrimitive.DOUBLE],
			[EDMPrimitive.Date, ABAPPrimitive.DATE],
			[EDMPrimitive.Time, ABAPPrimitive.TIME],
			// Offset/DateTime/Timestamp all map to TIMESTAMP in implementation
			[EDMPrimitive.DateTimeOffset, ABAPPrimitive.TIMESTAMP],
			[EDMPrimitive.DateTime, ABAPPrimitive.TIMESTAMP],
			[EDMPrimitive.Timestamp, ABAPPrimitive.TIMESTAMP],
			[EDMPrimitive.String, ABAPPrimitive.STRING],
			[EDMPrimitive.Binary, ABAPPrimitive.BINARY],
		])("maps %s to ABAP %s", (edm, expected) => {
			expect(EDM.edm2abap(edm)).toBe(expected);
		});

		test("unhandled EDM primitive returns null", () => {
			expect(EDM.edm2abap(-1 as unknown as EDMPrimitive)).toBeNull();
		});
	});
});
