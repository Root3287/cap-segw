import ABAPGenerator, {
	ABAPClassSectionType,
	ABAPParameterType,
	ABAPMethodType, 
	ABAPParameterReferenceType 
} from "../src/generator/ABAPGenerator";

describe("ABAPGenerator", () => {
	let generator: ABAPGenerator;

	beforeEach(() => {
		generator = new ABAPGenerator();
	});

	test("Empty Class", () => {
		generator.setABAPClass({
			name: "ZTEST"
		});

		const code = generator.generate();
		console.log(code);
		expect(code).not.toBeNull();
		expect(code).toContain("DEFINITION");
		// expect(code).toContain("PUBLIC SECTION.");
		// expect(code).toContain("PROTECTED SECTION.");
		// expect(code).toContain("PRIVATE SECTION.");
		expect(code).toContain("IMPLEMENTATION");
	});

	test("Simple Parameter", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				parameters: [
					{
						parameterType: ABAPParameterType.MEMBER,
						name: "foo",
						referenceType: ABAPParameterReferenceType.TYPE,
						type: "string"
					},
					{
						parameterType: ABAPParameterType.MEMBER,
						name: "bar",
						referenceType: ABAPParameterReferenceType.TYPE,
						type: "string"
					}
				]
			}
		});

		const code = generator.generate();
		console.log(code);
		expect(code).not.toBeNull();
		expect(code).toContain("DATA");
		expect(code).toContain("TYPE");
	});

	test("Simple Method", () => {
		generator.setABAPClass({
			name: "ZTEST",
			publicSection: {
				type: ABAPClassSectionType.PUBLIC,
				methods: [
					{
						type: ABAPMethodType.MEMBER,
						name: "TEST",
						importing: [
							{
								name: "IV_FOO",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string"
							},
							{
								name: "IV_BAR",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string"
							}
						],
						exporting: [
							{
								name: "IV_FOO",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string"
							},
							{
								name: "IV_BAR",
								referenceType: ABAPParameterReferenceType.TYPE,
								type: "string"
							}
						],
						returning: {
							name: "ret",
							referenceType: ABAPParameterReferenceType.TYPE,
							type: "DATUM"
						},
						code: [
							"iv_foo = |LOOL|."
						]
					}
				]
			}
		});

		const code = generator.generate();
		console.log(code);
		expect(code).not.toBeNull();
		expect(code).toContain("METHODS");
		expect(code).toContain("METHOD");
		expect(code).toContain("IMPORTING");
		expect(code).toContain("EXPORTING");
		expect(code).toContain("RETURNING");
	});
});