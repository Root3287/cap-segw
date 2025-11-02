import { 
	Primitive as ABAPPrimative
} from "../types/abap";
import { struct } from "@sap/cds";
import { Primitive as CDSPrimitive } from "../types/cds";
import { Primitive as EDMPrimative } from "../types/edm";

export class CDS {
	static cds2abap(type: CDSPrimitive): ABAPPrimative | null {
		let abapType: ABAPPrimative | null = null;
		switch(type){
			case CDSPrimitive.UUID:
				abapType = ABAPPrimative.UUID;
				break;
			case CDSPrimitive.Boolean:
				abapType = ABAPPrimative.BOOLEAN; // or FLAG
				break;
			case CDSPrimitive.Integer:
				abapType = ABAPPrimative.INTEGER;
				break;
			case CDSPrimitive.Int16:
				abapType = ABAPPrimative.INT16;
				break;
			case CDSPrimitive.Int32:
				abapType = ABAPPrimative.INT32;
				break;
			case CDSPrimitive.Int64:
				abapType = ABAPPrimative.INT64;
				break;
			case CDSPrimitive.UInt8:
				abapType = ABAPPrimative.UINT8;
				break;
			case CDSPrimitive.Decimal:
				abapType = ABAPPrimative.DECIMAL; // length 16 decimals 0
				break;
			case CDSPrimitive.Double:
				abapType = ABAPPrimative.DOUBLE;
				break;
			case CDSPrimitive.Date:
				abapType = ABAPPrimative.DATE;
				break;
			case CDSPrimitive.Time:
				abapType = ABAPPrimative.TIME;
				break;
			case CDSPrimitive.DateTime:
			case CDSPrimitive.Timestamp:
				abapType = ABAPPrimative.TIMESTAMP;
				break;
			case CDSPrimitive.LargeString:
			case CDSPrimitive.String:
				abapType = ABAPPrimative.STRING;
				break;
			case CDSPrimitive.LargeBinary:
			case CDSPrimitive.Binary:
				abapType = ABAPPrimative.BINARY;
				break;
			default:
				break;	
		}
		return abapType;
	}

	static cds2edm(type: CDSPrimitive): EDMPrimative | null {
		let edmType: EDMPrimative | null = null;
		switch(type){
			case CDSPrimitive.UUID:
				edmType = EDMPrimative.GUID;
				break;
			case CDSPrimitive.Boolean:
				edmType = EDMPrimative.Boolean; // or FLAG
				break;
			case CDSPrimitive.Integer:
				edmType = EDMPrimative.Int32;
				break;
			case CDSPrimitive.Int16:
				edmType = EDMPrimative.Int16;
				break;
			case CDSPrimitive.Int32:
				edmType = EDMPrimative.Int32;
				break;
			case CDSPrimitive.Int64:
				edmType = EDMPrimative.Int64;
				break;
			case CDSPrimitive.UInt8:
				edmType = EDMPrimative.Byte;
				break;
			case CDSPrimitive.Decimal:
				edmType = EDMPrimative.Decimal; // length 16 decimals 0
				break;
			case CDSPrimitive.Double:
				edmType = EDMPrimative.Double;
				break;
			case CDSPrimitive.Date:
				edmType = EDMPrimative.Date;
				break;
			case CDSPrimitive.Time:
				edmType = EDMPrimative.Time;
				break;
			case CDSPrimitive.DateTime:
				edmType = EDMPrimative.DateTime;
			case CDSPrimitive.Timestamp:
				edmType = EDMPrimative.Timestamp;
				break;
			case CDSPrimitive.LargeString:
			case CDSPrimitive.String:
				edmType = EDMPrimative.String;
				break;
			case CDSPrimitive.LargeBinary:
			case CDSPrimitive.Binary:
				edmType = EDMPrimative.Binary;
				break;
			default:
				break;	
		}
		return edmType;
	}
}