import { Cardinality } from "../types/abap";

/**
 * Get Cardinality from an association
 * @param  {any}         a Association/Composition
 * @return {Cardinality}   Cardinality Direction of Associaiton/Composition
 */
export function getCardinality(a: any): Cardinality | undefined {
	if(a?.["@segw.abap.multiplicity"]) return a?.["@segw.abap.multiplicity"];
	if(!a || a?.is2one && a?.is2many) return;
	if (a.is2one) 	return a?.["notNull"] ? Cardinality.cardinality_1_1 : Cardinality.cardinality_0_1;
	if (a?.is2many) return a?.["notNull"] ? Cardinality.cardinality_1_n : Cardinality.cardinality_0_n;
}

/**
 * Infers the other side Cardinality
 * @type Cardinality
 */
export function inferCardinality(side?: Cardinality): Cardinality {
	if(side === Cardinality.cardinality_0_1 || side === Cardinality.cardinality_1_1) return Cardinality.cardinality_0_n;
	if(side === Cardinality.cardinality_1_n) return Cardinality.cardinality_1_1;
	return Cardinality.cardinality_0_n;
};

/**
 * Given a pair of Assocations/Compositions
 * Determine it's Cardility
 * @param {any} a Left Association/Composition
 * @param {any} b Right Association/Composition
 * @return [Cardinality | undefined, Cardinality | undefined] | undefined
 */
export function getCardinalityPair(a?: any, b?: any): [Cardinality | undefined, Cardinality | undefined] | undefined {
	let left = getCardinality(a);
	let right = getCardinality(b);

	if(!left && right) left = inferCardinality(right);
	if(left && !right) right = inferCardinality(left);
	if(!left || !right){ return; }
	return [left, right];
}