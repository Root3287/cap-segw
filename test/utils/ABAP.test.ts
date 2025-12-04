import { ABAP } from "../../src/utils/ABAP";

describe("ABAP utils", () => {
	describe("getABAPName()", () => {
		test("string input: replaces spaces and dots with underscores", () => {
			expect(ABAP.getABAPName("ZCL.FOO BAR")).toBe("ZCL_FOO_BAR");
			expect(ABAP.getABAPName(" single.space ")).toBe("_single_space_");
			expect(ABAP.getABAPName("A..B   C")).toBe("A_B_C");
		});

		test("String object input: treated like string and sanitized", () => {
			// eslint-disable-next-line no-new-wrappers
			const s = new String("ZIF.MY INTERFACE");
			expect(ABAP.getABAPName(s)).toBe("ZIF_MY_INTERFACE");
		});

		test("object with name (no dots): returns name as-is", () => {
			const def = { name: "ZCLASS" };
			expect(ABAP.getABAPName(def)).toBe("ZCLASS");
		});

		test("object with name containing dots: returns name as-is when no service context", () => {
			const def = { name: "com.example.project.ZFOO" };
			expect(ABAP.getABAPName(def)).toBe("com.example.project.ZFOO");
		});

		test("object with _service drops the service prefix", () => {
			const def = { name: "com.example.project.ZFOO", _service: { name: "com.example.project" } };
			expect(ABAP.getABAPName(def)).toBe("ZFOO");
		});

		test("@segw.name overrides name completely (no sanitization)", () => {
			const def = {
				name: "com.example.ZBAR",
				["@segw.name"]: "MY OVERRIDE.NAME with spaces",
			};
			// Note: implementation returns override verbatim (no replace of spaces/dots)
			expect(ABAP.getABAPName(def)).toBe("MY OVERRIDE.NAME with spaces");
		});

		test("object with name and missing dots still works", () => {
			const def = { name: "JUST_A_NAME" };
			expect(ABAP.getABAPName(def)).toBe("JUST_A_NAME");
		});

		// Note: The implementation assumes object inputs have a valid `name` string.
		// It can throw if `definition.name` is missing because it accesses
		// `splitNamespace[splitNamespace.length-1]`. We avoid passing invalid objects.
	});

	describe("toABAPBool()", () => {
		test.each([
			[true, "abap_true"],
			[false, "abap_false"],
		])("maps %p -> %p", (val, expected) => {
			expect(ABAP.toABAPBool(val)).toBe(expected);
		});
	});
});
