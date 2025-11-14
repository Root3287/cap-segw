import { 
	Primitive as ABAPPrimative
} from "../types/abap";
import { struct } from "@sap/cds";
import { Primitive as EDMPrimitive } from "../types/edm";

export class EDM {

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
}