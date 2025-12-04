import CodeWriter from "../../src/generator/CodeWriter";

describe("CodeWriter", () => {
	let writer: CodeWriter;

	beforeEach(() => {
		writer = new CodeWriter();
	});

	test("Should return empty string", () => {
		const code = writer.generate();
		
		expect(code).not.toBeNull();
		expect(code).toBe("");
	});

	test("Should write one line", () => {
		const line = "This is a line";
		writer.writeLine(line);
		const code = writer.generate();
		
		expect(code).not.toBeNull();
		expect(code).toMatch(line);
	});

	test("Should write multiple line", () => {
		const numLines = Math.max(1, Math.floor(100 * Math.random()));
		const line = "This is a line";

		for (let i = 1; i < numLines; i++) {
			writer.writeLine(line);
		}

		const code = writer.generate();
		expect(code).not.toBeNull();

		// trailing newline produces an empty last entry after split
		expect(code.split("\n")).toHaveLength(numLines);
		// sanity: if we wrote any lines, they should all match the content
	    if (numLines > 1) {
			expect(code).toContain(line);
	    }
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
		const numLines = Math.max(1, Math.floor(10 * Math.random()));
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

	test("writeLine() with no argument writes an empty line (newline only)", () => {
		writer.writeLine();
		expect(writer.generate()).toBe("\n");
	});

	test("methods are chainable and return CodeWriter", () => {
		const ret = writer
			.increaseIndent()
			.writeLine("one")
			.decreaseIndent()
			.writeLine("two");

		expect(ret).toBe(writer);
		expect(writer.generate()).toBe("\tone\ntwo\n");
	});

	test("indent decreases apply only to subsequent lines", () => {
		writer.increaseIndent().increaseIndent(); // level 2
		writer.writeLine("x");                    // \t\tx
		writer.decreaseIndent();                  // level 1
		writer.writeLine("y");                    // \ty
		writer.decreaseIndent();                  // level 0
		writer.writeLine("z");                    // z

		expect(writer.generate()).toBe("\t\tx\n\ty\nz\n");
	});

	test("tabs are used for indentation (not spaces)", () => {
		writer.increaseIndent().writeLine("tabbed");
		const out = writer.generate();
		expect(out.startsWith("\t")).toBe(true);
		expect(out.startsWith(" ")).toBe(false);
		expect(out).toBe("\ttabbed\n");
	});

	test("multiple writeLine calls accumulate deterministically", () => {
		writer.writeLine("line1").writeLine("line2").writeLine("line3");
		expect(writer.generate()).toBe("line1\nline2\nline3\n");
	});

	test("complex flow: empty lines, nested indents, and resets", () => {
		writer
			.writeLine("root")     // level 0
			.increaseIndent()      // level 1
			.writeLine()           // empty line at level 1 (still just "\n")
			.writeLine("indented") // "\tindented"
			.increaseIndent()      // level 2
			.writeLine("more")     // "\t\tmore"
			.decreaseIndent()      // level 1
			.decreaseIndent()      // level 0
			.writeLine("back");    // "back"

		expect(writer.generate()).toBe(
			"root\n\t\n\tindented\n\t\tmore\nback\n"
		);
	});
});
