import { getCardinality, getCardinalityPair, inferCardinality } from "../../src/utils/Cardinality";
import { Cardinality } from "../../src/types/abap";

type Assoc = { is2one?: boolean; is2many?: boolean; notNull?: boolean } | undefined;

const a = (is2one?: boolean, is2many?: boolean, notNull?: boolean): Assoc => ({
	is2one,
	is2many,
	notNull,
});

describe("Cardinality helpers", () => {
	describe("getCardinality()", () => {
		test.each([
			["no flags (undefined object)", undefined, undefined],
			["no flags", a(false, false, false), undefined],
			["no flags but notNull", a(false, false, true), undefined],
			["2many nullable", a(false, true, false), Cardinality.cardinality_0_n],
			["2many notNull", a(false, true, true), Cardinality.cardinality_1_n],
			["2one nullable", a(true, false, false), Cardinality.cardinality_0_1],
			["2one notNull", a(true, false, true), Cardinality.cardinality_1_1],
			["conflicting flags (both true), nullable", a(true, true, false), undefined],
			["conflicting flags (both true), notNull", a(true, true, true), undefined],
		])("%s", (_label, input, expected) => {
			expect(getCardinality(input as any)).toBe(expected);
		});
	});

	describe("inferCardinality()", () => {
		test.each([
			["from 0..N stays 0..N", Cardinality.cardinality_0_n, Cardinality.cardinality_0_n],
			["from 1..N -> 1..1", Cardinality.cardinality_1_n, Cardinality.cardinality_1_1],
			["from 0..1 -> 0..N", Cardinality.cardinality_0_1, Cardinality.cardinality_0_n],
			["from 1..1 -> 0..N", Cardinality.cardinality_1_1, Cardinality.cardinality_0_n],
			["from undefined -> 0..N (default)", undefined as unknown as Cardinality, Cardinality.cardinality_0_n],
		])("%s", (_label, side, expected) => {
			expect(inferCardinality(side)).toBe(expected);
		});
	});

	describe("getCardinalityPair()", () => {
		test("both undefined -> undefined", () => {
			// Neither side provides enough info, so no inference possible.
			expect(getCardinalityPair(a(false, false, false), a(false, false, false))).toBeUndefined();
			expect(getCardinalityPair(undefined, undefined)).toBeUndefined();
		});

		test("left undefined, right valid -> left inferred", () => {
			// Right = 0..N -> left inferred to 0..N
			expect(getCardinalityPair(undefined, a(false, true, false))).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_0_n,
			]);

			// Right = 1..N -> left inferred to 1..1
			expect(getCardinalityPair(undefined, a(false, true, true))).toEqual([
				Cardinality.cardinality_1_1,
				Cardinality.cardinality_1_n,
			]);

			// Right = 0..1 -> left inferred to 0..N
			expect(getCardinalityPair(undefined, a(true, false, false))).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_0_1,
			]);

			// Right = 1..1 -> left inferred to 0..N
			expect(getCardinalityPair(undefined, a(true, false, true))).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_1_1,
			]);
		});

		test("right undefined, left valid -> right inferred", () => {
			// Left = 0..N -> right inferred to 0..N
			expect(getCardinalityPair(a(false, true, false), undefined)).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_0_n,
			]);

			// Left = 1..N -> right inferred to 1..1
			expect(getCardinalityPair(a(false, true, true), undefined)).toEqual([
				Cardinality.cardinality_1_n,
				Cardinality.cardinality_1_1,
			]);

			// Left = 0..1 -> right inferred to 0..N
			expect(getCardinalityPair(a(true, false, false), undefined)).toEqual([
				Cardinality.cardinality_0_1,
				Cardinality.cardinality_0_n,
			]);

			// Left = 1..1 -> right inferred to 0..N
			expect(getCardinalityPair(a(true, false, true), undefined)).toEqual([
				Cardinality.cardinality_1_1,
				Cardinality.cardinality_0_n,
			]);
		});

		test("both valid -> no inference, exact pair", () => {
			expect(getCardinalityPair(a(true, false, false), a(false, true, false))).toEqual([
				Cardinality.cardinality_0_1,
				Cardinality.cardinality_0_n,
			]);

			expect(getCardinalityPair(a(true, false, true), a(false, true, true))).toEqual([
				Cardinality.cardinality_1_1,
				Cardinality.cardinality_1_n,
			]);

			expect(getCardinalityPair(a(false, true, false), a(true, false, true))).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_1_1,
			]);
		});

		test("one side conflicting (both flags true) -> infer from the good side", () => {
			// Left invalid, right = 1..N -> left inferred to 1..1
			expect(getCardinalityPair(a(true, true, false), a(false, true, true))).toEqual([
				Cardinality.cardinality_1_1,
				Cardinality.cardinality_1_n,
			]);

			// Right invalid, left = 0..1 -> right inferred to 0..N
			expect(getCardinalityPair(a(true, false, false), a(true, true, false))).toEqual([
				Cardinality.cardinality_0_1,
				Cardinality.cardinality_0_n,
			]);
		});

		test("both conflicting or both invalid -> undefined", () => {
			expect(getCardinalityPair(a(true, true, false), a(true, true, true))).toBeUndefined();
			expect(getCardinalityPair(a(false, false, false), a(true, true, false))).toBeUndefined();
		});

		test("nullish inputs handled", () => {
			// Left valid + nullish right -> infer right
			expect(getCardinalityPair(a(true, false, true), null as unknown as any)).toEqual([
				Cardinality.cardinality_1_1,
				Cardinality.cardinality_0_n,
			]);

			// Right valid + nullish left -> infer left
			expect(getCardinalityPair(undefined, a(false, true, false))).toEqual([
				Cardinality.cardinality_0_n,
				Cardinality.cardinality_0_n,
			]);
		});
	});
});