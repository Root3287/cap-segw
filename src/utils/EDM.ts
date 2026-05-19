import { 
	Primitive as ABAPPrimative
} from "../types/abap";
import { struct } from "@sap/cds";
import { Primitive as EDMPrimitive } from "../types/edm";

export class EDM {
	static readonly V4_MED_ELEMENT_DATA_TYPE_PREFIX = "/iwbep/if_v4_med_element=>gcs_edm_data_types-";

	/**
	 * Converts from EDM types to ABAP Primative Type
	 * @param  {EDMPrimitive}  type EDM Primative
	 * @return {ABAPPrimative}      ABAP Primative
	 */
	static edm2abap(type: EDMPrimitive): ABAPPrimative | null {
		let abapType: ABAPPrimative | null = null;
		switch(type){
			case EDMPrimitive.Guid:
				abapType = ABAPPrimative.UUID;
				break;
			case EDMPrimitive.Boolean:
				abapType = ABAPPrimative.BOOLEAN; // or FLAG
				break;
			case EDMPrimitive.Int32:
				abapType = ABAPPrimative.INTEGER;
				break;
			case EDMPrimitive.Int16:
				abapType = ABAPPrimative.INT16;
				break;
			case EDMPrimitive.Int64:
				abapType = ABAPPrimative.INT64;
				break;
				break;
			case EDMPrimitive.Byte:
				abapType = ABAPPrimative.UINT8;
				break;
			case EDMPrimitive.Decimal:
				abapType = ABAPPrimative.DECIMAL; // length 16 decimals 0
				break;
			case EDMPrimitive.Double:
				abapType = ABAPPrimative.DOUBLE;
				break;
			case EDMPrimitive.Date:
				abapType = ABAPPrimative.DATE;
				break;
			case EDMPrimitive.Time:
				abapType = ABAPPrimative.TIME;
				break;
			case EDMPrimitive.DateTimeOffset:
			case EDMPrimitive.DateTime:
			case EDMPrimitive.Timestamp:
				abapType = ABAPPrimative.TIMESTAMP;
				break;
			case EDMPrimitive.String:
				abapType = ABAPPrimative.STRING;
				break;
			case EDMPrimitive.Binary:
				abapType = ABAPPrimative.BINARY;
				break;
			default:
				break;	
		}
		return abapType;
	}

	/**
	 * Converts EDM types to /iwbep/if_v4_med_element=>gcs_edm_data_type-* constants
	 * @param  {EDMPrimitive} type EDM Primitive
	 * @return {string | null} ABAP constant expression
	 */
	static edm2v4MedDataType(type: EDMPrimitive): string | null {
		let suffix: string | null = null;
		switch(type){
			case EDMPrimitive.Binary:
				suffix = "binary";
				break;
			case EDMPrimitive.Boolean:
				suffix = "boolean";
				break;
			case EDMPrimitive.Byte:
				suffix = "byte";
				break;
			case EDMPrimitive.Date:
				suffix = "date";
				break;
			case EDMPrimitive.DateTimeOffset:
				suffix = "datetimeoffset";
				break;
			case EDMPrimitive.Decimal:
				suffix = "decimal";
				break;
			case EDMPrimitive.Double:
				suffix = "double";
				break;
			case EDMPrimitive.Duration:
				suffix = "duration";
				break;
			case EDMPrimitive.Guid:
				suffix = "guid";
				break;
			case EDMPrimitive.Int16:
				suffix = "int16";
				break;
			case EDMPrimitive.Int32:
				suffix = "int32";
				break;
			case EDMPrimitive.Int64:
				suffix = "int64";
				break;
			case EDMPrimitive.SByte:
				suffix = "sbyte";
				break;
			case EDMPrimitive.Single:
				suffix = "single";
				break;
			case EDMPrimitive.Stream:
				suffix = "stream";
				break;
			case EDMPrimitive.Time:
				suffix = "time";
				break;
			case EDMPrimitive.DateTime:
				suffix = "datetime";
				break;
			case EDMPrimitive.Timestamp:
				suffix = "timestamp";
				break;
			case EDMPrimitive.TimeOfDay:
				suffix = "timeofday";
				break;
			case EDMPrimitive.String:
				suffix = "string";
				break;
			default:
				break;
		}

		return (suffix) ? `${EDM.V4_MED_ELEMENT_DATA_TYPE_PREFIX}${suffix}` : null;
	}
}
