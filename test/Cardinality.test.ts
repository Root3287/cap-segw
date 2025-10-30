import { getCardinality, getCardinalityPair, inferCardinality } from "../src/utils/Cardinality";
import { Cardinality } from "../src/types/abap";

describe("Cardinality", () => {
	test.each([
		[{ is2one: false, is2many: false, notNull: false }, undefined],
		[{ is2one: false, is2many: false, notNull: true }, undefined],
		[{ is2one: false, is2many: true, notNull: false }, Cardinality.cardinality_0_n],
		[{ is2one: false, is2many: true, notNull: true }, Cardinality.cardinality_1_n],
		[{ is2one: true, is2many: false, notNull: false }, Cardinality.cardinality_0_1],
		[{ is2one: true, is2many: false, notNull: true }, Cardinality.cardinality_1_1],
		[{ is2one: true, is2many: true, notNull: false }, undefined],
		[{ is2one: true, is2many: true, notNull: true }, undefined],
	])("", (association: any, expected: Cardinality | undefined) => {
		expect(getCardinality(association)).toBe(expected);
	});

	test.each([
		[Cardinality.cardinality_0_n, Cardinality.cardinality_0_n],
		[Cardinality.cardinality_1_n, Cardinality.cardinality_1_1],
		[Cardinality.cardinality_0_1, Cardinality.cardinality_0_n],
		[Cardinality.cardinality_1_1, Cardinality.cardinality_0_n],
	])("", (side: Cardinality, expected: Cardinality) => {
		expect(inferCardinality(side)).toBe(expected);
	});
	
	// test.each([
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: false }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: true, notNull: false }, Cardinality.cardinality_0_n],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: true, notNull: true }, Cardinality.cardinality_1_n],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: true, is2many: false, notNull: false }, Cardinality.cardinality_0_1],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: true, is2many: false, notNull: true }, Cardinality.cardinality_1_1],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: true, is2many: true, notNull: false }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: true, is2many: true, notNull: true }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: true }, 		{ is2one: false, is2many: false, notNull: false }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: true }, 		{ is2one: false, is2many: false, notNull: true }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: true }, 		{ is2one: false, is2many: false, notNull: true }, Cardinality.cardinality_0_n],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, Cardinality.cardinality_1_n],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, Cardinality.cardinality_0_1],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, Cardinality.cardinality_1_1],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, undefined],
	// 	[{ is2one: false, is2many: false, notNull: false }, 	{ is2one: false, is2many: false, notNull: true }, undefined],
	// ]("", (a: any, b: any, expected: Cardinality | undefined) => {
	// 	// expect(getCardinality({is2one: is2one, is2many: is2many, notNull: notNull })).toBe(expected);
	// });
});