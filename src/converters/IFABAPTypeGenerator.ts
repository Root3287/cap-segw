import * as ABAP from "../types/abap";

export default interface IFABAPTypeGenerator {
	/**
	 * Get Generated ABAP Types
	 * @return {Array} ABAP Types
	 */
	getABAPTypes(): Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>;
}