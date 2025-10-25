import { CodeWriter } from "../src/generator/CodeWriter";

describe("CodeWriter", () => {
	let writer: CodeWriter;

	beforeEach(() => {
		writer = new CodeWriter();
	});

	test("Should return empty string", () => {
		const code = writer.generate();
		
		expect(code).not.toBeNull();
	});

	test("Should write one line", () => {
		const line = "This is a line";
		writer.writeLine(line);
		const code = writer.generate();
		
		expect(code).not.toBeNull();
		expect(code).toMatch(line);
	});

	test("Should write multiple line", () => {
		const numLines = Math.floor(100 * Math.random());
		const line = "This is a line";
		for(let i = 1; i < numLines; i++){
			writer.writeLine(line);
		}

		const code = writer.generate();
		expect(code).not.toBeNull();
		expect(code.split("\n")).toHaveLength(numLines);
	});

	test("Should Indent", () => {
		writer.writeLine("Hello");
		writer.increaseIndent();
		writer.writeLine("World");

		const code = writer.generate();
		expect(code).not.toBeNull();
		expect(code).toContain("\t");
		expect(code).toMatch("Hello\n\tWorld\n");
	});

	test("Should Indent Multiple", () => {
		writer.writeLine("Hello");
		const numLines = Math.floor(10 * Math.random());
		for(let i = 1; i < numLines+1; i++){
			writer.increaseIndent();
		}
		writer.writeLine("World");

		const code = writer.generate();
		expect(code).not.toBeNull();
		expect(code).toContain("\t");
		expect(code).toMatch(`Hello\n${'\t'.repeat(numLines)}World\n`);
	});

	test("Should Indent/Detent", () => {
		writer.writeLine("Hello");
		writer.increaseIndent();
		writer.decreaseIndent();
		writer.writeLine("World");

		const code = writer.generate();
		expect(code).not.toBeNull();
		expect(code).not.toContain("\t");
		expect(code).toMatch(`Hello\nWorld\n`);
	});

	test("Should Detent Multiple Times Should Not throw errors", () => {
		writer.writeLine("Hello");
		writer.increaseIndent();
		writer.decreaseIndent();
		writer.decreaseIndent();
		writer.decreaseIndent();
		writer.writeLine("World");

		const code = writer.generate();
		expect(code).not.toBeNull();
		expect(code).not.toContain("\t");
		expect(code).toMatch(`Hello\nWorld\n`);
	});
});