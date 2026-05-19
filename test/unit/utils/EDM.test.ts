import { EDM } from "../../../src/utils/EDM";
import { Primitive as EDMPrimitive } from "../../../src/types/edm";
import { Primitive as ABAPPrimitive } from "../../../src/types/abap";

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

	describe("edm2v4MedDataType()", () => {
		test.each([
			[EDMPrimitive.Binary, "/iwbep/if_v4_med_element=>gcs_edm_data_type-binary"],
			[EDMPrimitive.Guid, "/iwbep/if_v4_med_element=>gcs_edm_data_type-guid"],
			[EDMPrimitive.Boolean, "/iwbep/if_v4_med_element=>gcs_edm_data_type-boolean"],
			[EDMPrimitive.Byte, "/iwbep/if_v4_med_element=>gcs_edm_data_type-byte"],
			[EDMPrimitive.Int16, "/iwbep/if_v4_med_element=>gcs_edm_data_type-int16"],
			[EDMPrimitive.Int32, "/iwbep/if_v4_med_element=>gcs_edm_data_type-int32"],
			[EDMPrimitive.Int64, "/iwbep/if_v4_med_element=>gcs_edm_data_type-int64"],
			[EDMPrimitive.Date, "/iwbep/if_v4_med_element=>gcs_edm_data_type-date"],
			[EDMPrimitive.DateTime, "/iwbep/if_v4_med_element=>gcs_edm_data_type-datetime"],
			[EDMPrimitive.DateTimeOffset, "/iwbep/if_v4_med_element=>gcs_edm_data_type-datetimeoffset"],
			[EDMPrimitive.Decimal, "/iwbep/if_v4_med_element=>gcs_edm_data_type-decimal"],
			[EDMPrimitive.Double, "/iwbep/if_v4_med_element=>gcs_edm_data_type-double"],
			[EDMPrimitive.Duration, "/iwbep/if_v4_med_element=>gcs_edm_data_type-duration"],
			[EDMPrimitive.SByte, "/iwbep/if_v4_med_element=>gcs_edm_data_type-sbyte"],
			[EDMPrimitive.Single, "/iwbep/if_v4_med_element=>gcs_edm_data_type-single"],
			[EDMPrimitive.Stream, "/iwbep/if_v4_med_element=>gcs_edm_data_type-stream"],
			[EDMPrimitive.String, "/iwbep/if_v4_med_element=>gcs_edm_data_type-string"],
			[EDMPrimitive.Time, "/iwbep/if_v4_med_element=>gcs_edm_data_type-time"],
			[EDMPrimitive.TimeOfDay, "/iwbep/if_v4_med_element=>gcs_edm_data_type-timeofday"],
			[EDMPrimitive.Timestamp, "/iwbep/if_v4_med_element=>gcs_edm_data_type-timestamp"],
		])("maps %s to V4 MED data type %s", (edm, expected) => {
			expect(EDM.edm2v4MedDataType(edm)).toBe(expected);
		});

		test("unhandled EDM primitive returns null", () => {
			expect(EDM.edm2v4MedDataType(-1 as unknown as EDMPrimitive)).toBeNull();
		});
	});
});
