import { linked } from "@sap/cds";

export interface CompilerInfo {
	csn: linked.LinkedCSN;
	csdl: any;
	options ?: any;
};

export interface CompileOptions {
	[option: string]: any;
	impl?: boolean;
	extOnly?: boolean;
	"odata-version"?: string | number;
};

export interface OutputData {
	filename: string;
	code: string;
};
