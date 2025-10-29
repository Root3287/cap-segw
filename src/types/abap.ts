export enum Primitive {
	UUID = "sysuuid_x",
	BOOLEAN = "abap_bool",
	INTEGER = "i",
	INT16 = "/iwbep/sb_odata_ty_int2",
	INT32 = "i",
	INT64 = "INT8",
	UINT8 = "/iwbep/sb_odata_ty_int2",
	DECIMAL = "P", // length 16 decimals 0
	DOUBLE = "F",
	DATE = "D",
	TIME = "T",
	TIMESTAMP = "TIMESTAMP",
	STRING = "STRING",
	BINARY = "XSTRING",
};

export enum MethodType {
	STATIC = "CLASS-METHOD",
	MEMBER = "METHOD",
};

export enum MethodParameterPassBy {
	REFERENCE = "REFERENCE",
	VALUE = "VALUE",
}

export enum ParameterReferenceType {
	TYPE = "TYPE",
	TYPE_REF = "TYPE REF TO",
	LIKE = "LIKE",
	TYPE_STANDARD_TABLE = "TYPE STANDARD TABLE OF",
	TYPE_SORTED_TABLE = "TYPE SORTED TABLE OF",
	TYPE_HASH_TABLE = "TYPE HASH TABLE OF",
};

export type MethodParameters = {
	passBy?: MethodParameterPassBy;
	name: string;
	referenceType: ParameterReferenceType;
	type: string;
	isOptional ?: boolean;
};

export type Method = {
	type: MethodType;
	name: string;
	isFinal?: boolean;
	isRedefinition?: boolean;
	importing?: MethodParameters[];
	exporting?: MethodParameters[];
	changing?: MethodParameters[];
	returning?: MethodParameters;
	raising?: string[];
	code?: string[];
};

export enum ParameterType {
	STATIC = "CLASS-DATA",
	MEMBER = "DATA",
	CONSTANTS = "CONSTANTS"
};

export type Parameter = {
	parameterType?: ParameterType;
	name: string;
	referenceType: ParameterReferenceType;
	type: string;
	length?: number;
	decimal ?: number;
	value ?: string;
};

export type Structure = {
	name: string;
	parameters: Parameter[];
};

export type Table = {
	structure: Parameter;
	key?: string;
}

export enum ClassSectionType {
	PUBLIC = "PUBLIC",
	PROTECTED = "PROTECTED",
	PRIVATE = "PRIVATE"
};

export type ClassSection = {
	type: ClassSectionType;
	types?: Array<Structure | Parameter | Table>;
	parameters?: Parameter[];
	methods?: Method[];
};

export type Class = {
	name: string;
	extending?: string;
	inheriting?: string[];
	interfaces?: string[];
	isAbstract?: boolean;
	isFinal?: boolean;
	publicSection?: ClassSection;
	protectedSection?: ClassSection;
	privateSection?: ClassSection;
};