import { linked } from "@sap/cds";

export interface CompilerInfo {
	csn: linked.LinkedCSN;
	csdl: any;
	options ?: any;
};

export interface OutputData {
	filename: string;
	code: string;
};