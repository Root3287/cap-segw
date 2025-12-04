import ABAPGenerator from "../../../src/generator/ABAPGenerator";
import {
	ClassSectionType as ABAPClassSectionType,
	ParameterType as ABAPParameterType,
	MethodType as ABAPMethodType, 
	MethodParameterPassBy as ABAPMethodParameterPassBy,
	ParameterReferenceType as ABAPParameterReferenceType 
} from "../../../src/types/abap";

describe("ABAPGenerator", () => {
	let generator: ABAPGenerator;

	beforeEach(() => {
		generator = new ABAPGenerator();
	});

	test("Empty Class", () => {
		generator.setABAPClass({ name: "ZTEST" });

		const code = generator.generate();
		expect(code).toContain("CLASS ZTEST DEFINITION");
		expect(code).toContain("PUBLIC"); // header modifier
		expect(code).toContain("CREATE PUBLIC.");
		// Sections are only written if provided, so don't expect them here.
		expect(code).toContain("ENDCLASS.");
		expect(code).toContain("CLASS ZTEST IMPLEMENTATION.");
		expect(code).toContain("ENDCLASS.");
	});

	test("Simple Parameter (PUBLIC SECTION)", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				parameters: [
					{
						parameterType: ABAPParameterType.MEMBER, // expected to produce "DATA"
						name: "foo",
						referenceType: ABAPParameterReferenceType.TYPE,
						type: "string",
					},
					{
						parameterType: ABAPParameterType.MEMBER,
						name: "bar",
						referenceType: ABAPParameterReferenceType.TYPE,
						type: "string",
					},
				],
			},
		});

		const code = generator.generate();
		expect(code).toContain("PUBLIC SECTION.");
		expect(code).toContain("DATA foo TYPE string.");
		expect(code).toContain("DATA bar TYPE string.");
	});

	test("Simple Method with importing/exporting/returning and implementation", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				methods: {
					TEST: {
						type: ABAPMethodType.MEMBER, // should form "METHODS TEST"
						importing: [
							{
								name: "IV_FOO",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string",
							},
							{
								name: "IV_BAR",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string",
								isOptional: true,
							},
						],
						exporting: [
							{ name: "EV_FOO", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
							{ name: "EV_BAR", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
						],
						returning: {
							name: "RV_DATE",
							referenceType: ABAPParameterReferenceType.TYPE,
							type: "DATUM",
						},
						code: ["iv_foo = |LOOL|."],
					},
				},
			},
		});

		const code = generator.generate();
		// Definition
		expect(code).toContain("PUBLIC SECTION.");
		expect(code).toContain("METHODS TEST");
		expect(code).toContain("IMPORTING");
		// default pass-by REFERENCE, with leading "!" lines
		expect(code).toContain("!REFERENCE(IV_FOO) TYPE string");
		expect(code).toContain("!REFERENCE(IV_BAR) TYPE string optional");
		expect(code).toContain("EXPORTING");
		expect(code).toContain("!REFERENCE(EV_FOO) TYPE string");
		expect(code).toContain("!REFERENCE(EV_BAR) TYPE string");
		// Returning is forced to VALUE by the generator
		expect(code).toContain("RETURNING");
		expect(code).toContain("!VALUE(RV_DATE) TYPE DATUM");

		// Implementation
		expect(code).toContain("CLASS ZTEST IMPLEMENTATION.");
		expect(code).toContain("METHOD TEST.");
		expect(code).toContain("iv_foo = |LOOL|.");
		expect(code).toContain("ENDMETHOD.");
	});

	test("Simple Structure (TYPES BEGIN OF ... END OF ...)", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				types: [
					{
						name: "TY_STRUC",
						parameters: [
							{ name: "ID", referenceType: ABAPParameterReferenceType.TYPE, type: "GUID" },
							{ name: "NAME", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
						],
					},
				],
			},
		});

		const code = generator.generate();
		expect(code).toContain("PUBLIC SECTION.");
		expect(code).toContain("TYPES: BEGIN OF TY_STRUC,");
		expect(code).toContain("ID TYPE GUID,");
		expect(code).toContain("NAME TYPE string,");
		expect(code).toContain("END OF TY_STRUC.");
	});

	test("Simple Table Type (TYPES <tab> TYPE STANDARD TABLE <struc>)", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				types: [
					{
						name: "TY_STRUC",
						parameters: [
							{ name: "ID", referenceType: ABAPParameterReferenceType.TYPE, type: "GUID" },
							{ name: "NAME", referenceType: ABAPParameterReferenceType.TYPE, type: "string" },
						],
					},
					{
						structure: {
							name: "TT_STRUC",
							referenceType: ABAPParameterReferenceType.TYPE_STANDARD_TABLE,
							type: "TY_STRUC",
						},
					},
				],
			},
		});

		const code = generator.generate();
		expect(code).toContain("TYPES: BEGIN OF TY_STRUC,");
		expect(code).toContain("END OF TY_STRUC.");
		expect(code).toContain("TYPES: TT_STRUC TYPE STANDARD TABLE OF TY_STRUC");
	});

	test("Type Alias (TYPES <alias> TYPE <basetype>.)", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				types: [
					{
						name: "TY_STRING",
						referenceType: ABAPParameterReferenceType.TYPE,
						type: "string",
					},
				],
			},
		});

		const code = generator.generate();
		expect(code).toContain("PUBLIC SECTION.");
		expect(code).toContain("TYPES: TY_STRING TYPE string.");
	});

	test("Interfaces listed in PUBLIC SECTION", () => {
		generator.setABAPClass({
			name: "ZTEST",
			interfaces: ["IF_A", "IF_B"],
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
			},
		});

		const code = generator.generate();
		// In PUBLIC SECTION block, generator writes:
		//   INTERFACE IF_A.
		//   INTERFACE IF_B.
		expect(code).toContain("PUBLIC SECTION.");
		expect(code).toContain("INTERFACE IF_A.");
		expect(code).toContain("INTERFACE IF_B.");
	});

	test("Class header flags: INHERITING FROM, ABSTRACT, FINAL", () => {
		generator.setABAPClass({
			name: "ZCHILD",
			inheriting: ["ZPARENT", "ZPARENT2"],
			isAbstract: true,
			isFinal: true,
			publicSection: { type: ABAPClassSectionType.PUBLIC },
		});

		const code = generator.generate();
		expect(code).toContain("CLASS ZCHILD DEFINITION");
		expect(code).toContain("PUBLIC");
		expect(code).toContain("INHERITING FROM ZPARENT");
		expect(code).toContain("INHERITING FROM ZPARENT2");
		expect(code).toContain("ABSTRACT");
		expect(code).toContain("FINAL");
		expect(code).toContain("CREATE PUBLIC.");
	});

	test("Method with RAISING exceptions", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				methods: {
					DO_THING: {
						type: ABAPMethodType.MEMBER,
						raising: ["ZCX_ERROR", "ZCX_OTHER"],
						code: ["WRITE: / 'ok'."],
					},
				},
			},
		});

		const code = generator.generate();
		expect(code).toContain("METHODS DO_THING");
		expect(code).toContain("RAISING");
		expect(code).toContain("ZCX_ERROR");
		expect(code).toContain("ZCX_OTHER");
		expect(code).toContain("METHOD DO_THING.");
		expect(code).toContain("WRITE: / 'ok'.");
		expect(code).toContain("ENDMETHOD.");
	});

	test("Redefinition-only method omits parameter blocks in definition", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				methods: {
					REDEF_ME: {
						type: ABAPMethodType.MEMBER,
						isRedefinition: true,
						// Any parameters present would be ignored by the generator for redefinitions
						importing: [
							{
								name: "IV_IGNORED",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string",
							},
						],
						code: ["* no body"],
					},
				},
			},
		});

		const code = generator.generate();
		// Definition should end after "REDEFINITION." (no IMPORTING/EXPORTING/RETURNING blocks)
		expect(code).toMatch(/METHODS REDEF_ME REDEFINITION\./);
		expect(code).not.toMatch(/IMPORTING/);
		expect(code).not.toMatch(/EXPORTING/);
		expect(code).not.toMatch(/RETURNING/);

		// Implementation still exists (generator writes all implementations present)
		expect(code).toContain("METHOD REDEF_ME.");
		expect(code).toContain("* no body");
		expect(code).toContain("ENDMETHOD.");
	});

	test("Protected and Private sections with methods appear and implement", () => {
		generator.setABAPClass({
			name: "ZTEST",
			protectedSection: {
				type: ABAPClassSectionType.PROTECTED,
				methods: {
					P_DO: {
						type: ABAPMethodType.MEMBER,
						code: ["WRITE: / 'protected'."],
					},
				},
			},
			privateSection: {
				type: ABAPClassSectionType.PRIVATE,
				methods: {
					S_DO: {
						type: ABAPMethodType.MEMBER,
						code: ["WRITE: / 'private'."],
					},
				},
			},
		});

		const code = generator.generate();
		expect(code).toContain("PROTECTED SECTION.");
		expect(code).toContain("METHODS P_DO");
		expect(code).toContain("PRIVATE SECTION.");
		expect(code).toContain("METHODS S_DO");

		expect(code).toContain("METHOD P_DO.");
		expect(code).toContain("protected");
		expect(code).toContain("ENDMETHOD.");

		expect(code).toContain("METHOD S_DO.");
		expect(code).toContain("private");
		expect(code).toContain("ENDMETHOD.");
	});

	test("Method CHANGING parameters and explicit pass-by VALUE/REFERENCE", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				methods: {
					MIXED: {
						type: ABAPMethodType.MEMBER,
						importing: [
							// explicit VALUE
							{
								name: "IV_VAL",
								passBy: ABAPMethodParameterPassBy.VALUE,
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "i",
							},
							// explicit REFERENCE
							{
								name: "IR_REF",
								passBy: ABAPMethodParameterPassBy.REFERENCE,
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "ref to object",
							},
						],
						changing: [
							{
								name: "CV_NUM",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "i",
							},
						],
						code: ["cv_num = iv_val."],
					},
				},
			},
		});

		const code = generator.generate();
		expect(code).toContain("METHODS MIXED");
		expect(code).toContain("IMPORTING");
		expect(code).toContain("!VALUE(IV_VAL) TYPE i");
		expect(code).toContain("!REFERENCE(IR_REF) TYPE ref to object");
		expect(code).toContain("CHANGING");
		// CHANGING default pass-by is REFERENCE per generator
		expect(code).toContain("!REFERENCE(CV_NUM) TYPE i");
		expect(code).toContain("METHOD MIXED.");
		expect(code).toContain("cv_num = iv_val.");
		expect(code).toContain("ENDMETHOD.");
	});
});
