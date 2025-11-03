import CDSTypeConverter from "../../src/converters/CDSTypeConverter";
import * as ABAP from "../../src/types/abap";
import * as CDS from "../../src/types/cds";

/** Helpers */
const findStructure = (
	types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>,
	name: string
): ABAP.Structure | undefined =>
	types.find((t: any) => t && "name" in t && t.name === name) as ABAP.Structure | undefined;

const findTableType = (
	types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>,
	tableName: string
): ABAP.Table | undefined =>
	types.find((t: any) => t && "structure" in t && t.structure?.name === tableName) as ABAP.Table | undefined;

const findParam = (s: ABAP.Structure | undefined, pname: string) =>
	s?.parameters?.find(p => p.name === pname);

/** Build a CDS-like element object with a chosen prototype. */
const withProto = <T extends object>(obj: T, proto: object): T => {
	Object.setPrototypeOf(obj as object, proto);
	return obj;
};

describe("CDSTypeConverter", () => {
	let conv: CDSTypeConverter;

	beforeEach(() => {
		conv = new CDSTypeConverter();
	});

	test("Empty service -> no types", () => {
		conv.setService({});
		expect(conv.getABAPTypes()).toEqual([]);
	});

	test("Entity with primitive properties -> structure + table type; DECIMAL gets length/decimal", () => {
		const entity = {
			name: "my.service.Product",
			elements: [
				{ name: "ID",    kind: "element", type: CDS.Primitive.UUID },
				{ name: "NAME",  kind: "element", type: CDS.Primitive.String },
				{ name: "PRICE", kind: "element", type: CDS.Primitive.Decimal },
			],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		const structName = "t_Product";
		const tableName  = "tt_Product";

		const s = findStructure(types, structName);
		expect(s).toBeDefined();
		expect(s?.parameters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "ID",   type: ABAP.Primitive.UUID }),
				expect.objectContaining({ name: "NAME", type: ABAP.Primitive.STRING }),
				// DECIMAL special casing
				expect.objectContaining({ name: "PRICE", type: ABAP.Primitive.DECIMAL, length: 16, decimal: 0 }),
			])
		);

		const t = findTableType(types, tableName);
		expect(t).toBeDefined();
		expect(t?.structure?.type).toBe(structName);
		expect(t?.structure?.referenceType).toBe(ABAP.ParameterReferenceType.TYPE_STANDARD_TABLE);
	});

	test("Entity-level @segw.abap.type => creates type alias + table alias; no element expansion", () => {
		const entity = {
			name: "my.service.Custom",
			["@segw.abap.type"]: "ZMY_ABAP_TYPE",
			elements: [
				{ name: "IGNORED", kind: "element", type: CDS.Primitive.String },
			],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		const aliasName = "t_Custom";   // Parameter alias
		const tableName = "tt_Custom";  // Table alias of alias

		const alias = types.find((t: any) => "name" in (t ?? {}) && t.name === aliasName) as ABAP.Parameter;
		expect(alias).toBeDefined();
		expect(alias.referenceType).toBe(ABAP.ParameterReferenceType.TYPE);
		expect(alias.type).toBe("ZMY_ABAP_TYPE");

		const ttAlias = findTableType(types, tableName);
		expect(ttAlias).toBeDefined();
		expect(ttAlias?.structure?.type).toBe(aliasName);

		// Should NOT expand element into structure since alias short-circuits
		const expandedStruct = findStructure(types, "t_Custom");
		// expandedStruct === alias (Parameter), make sure no duplicate Structure with same name sneaks in
		expect(expandedStruct && (expandedStruct as any).parameters).toBeUndefined();
	});

	test("Property-level @segw.abap.type overrides primitive mapping", () => {
		const entity = {
			name: "svc.Thing",
			elements: [
				{ name: "A", kind: "element", type: CDS.Primitive.String, ["@segw.abap.type"]: "ZSTRING40" },
				{ name: "B", kind: "element", type: CDS.Primitive.Int32 },
			],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		const s = findStructure(types, "t_Thing");
		expect(s).toBeDefined();

		const a = findParam(s, "A");
		expect(a?.type).toBe("ZSTRING40"); // override applied

		const b = findParam(s, "B");
		expect(b?.type).toBe(ABAP.Primitive.INT32);
	});

	test("Associations/Compositions are skipped", () => {
		const entity = {
			name: "svc.Node",
			elements: [
				{ name: "ID", kind: "element", type: CDS.Primitive.UUID },
				{ name: "PARENT", kind: "element", type: CDS.Primitive.Association }, // should be skipped
				{ name: "CHILDREN", kind: "element", type: CDS.Primitive.Composition }, // should be skipped
			],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		const s = findStructure(types, "t_Node");
		expect(s).toBeDefined();
		expect(findParam(s, "ID")).toBeDefined();
		expect(findParam(s, "PARENT")).toBeUndefined();
		expect(findParam(s, "CHILDREN")).toBeUndefined();
	});

	test("Prototype-based TYPE ALIAS: property references a primitive via prototype.type", () => {
		// property.type is a dotted alias; prototype carries primitive type
		const aliasProp = withProto(
			{ name: "COUNT", kind: "element", type: "my.model.IntAlias" },
			{ type: CDS.Primitive.Int32 }
		);

		const entity = {
			name: "svc.Counter",
			elements: [aliasProp],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		// Expect property COUNT to use t_IntAlias and that alias/table were created
		const s = findStructure(types, "t_Counter");
		expect(s).toBeDefined();

		const p = findParam(s, "COUNT");
		expect(p?.type).toBe("t_IntAlias");

		const alias = types.find((t: any) => t && "name" in t && t.name === "t_IntAlias") as ABAP.Parameter;
		expect(alias?.referenceType).toBe(ABAP.ParameterReferenceType.TYPE);
		expect(alias?.type).toBe(ABAP.Primitive.INT32);

		const ttAlias = findTableType(types, "tt_IntAlias");
		expect(ttAlias).toBeDefined();
		expect(ttAlias?.structure?.type).toBe("t_IntAlias");
	});

	test("Prototype-based COMPLEX TYPE: prototype.kind==='type' with its own elements", () => {
		// Complex type 'my.model.Address' with STREET:String
		const complexProto = {
			kind: "type",
			elements: [
				{ name: "STREET", kind: "element", type: CDS.Primitive.String },
			],
		};

		const complexProp = withProto(
			{ name: "ADDR", kind: "element", type: "my.model.Address" },
			complexProto
		);

		const entity = {
			name: "svc.Customer",
			elements: [complexProp],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		// The property should reference ABAP name of complex type = "Address"
		const main = findStructure(types, "t_Customer");
		expect(main).toBeDefined();
		const addrParam = findParam(main, "ADDR");
		expect(addrParam?.type).toBe("Address");

		// And a structure for the complex type should have been created (plus its table type)
		const addrStruct = findStructure(types, "t_Address"); // Note: not prefixed with t_ (per converter)
		expect(addrStruct).toBeDefined();
		expect(findParam(addrStruct, "STREET")?.type).toBe(ABAP.Primitive.STRING);

		const addrTable = findTableType(types, "tt_Address");
		expect(addrTable).toBeDefined();
		expect(addrTable?.structure?.type).toBe("t_Address");
	});

	test("Action input structure generation (primitives + alias + complex + skips association)", () => {
		// alias via prototype
		const aliasParam = withProto(
			{ kind: "element", type: "my.ns.MyInt" },
			{ type: CDS.Primitive.Int32 }
		);

		// complex via prototype.kind === "type"
		const complexProto = {
			kind: "type",
			elements: [{ name: "V", kind: "element", type: CDS.Primitive.Boolean }],
		};
		const complexParam = withProto({ kind: "element", type: "my.ns.MyComplex" }, complexProto);

		const action = {
			params: {
				"amount": { kind: "element", type: CDS.Primitive.Decimal },
				"count": aliasParam,
				"complex": complexParam,
				"rel": { kind: "element", type: CDS.Primitive.Association }, // skipped
			},
		};

		const service = {
			actions: [{ /* name is passed to ABAPUtils.getABAPName(action) in converter */
				name: "DoWork", // ABAPUtils.getABAPName('string') path
				...action,
			}],
		};

		conv.setService(service);
		const types = conv.getABAPTypes();

		const inputStruct = findStructure(types, "t_DoWork_input");
		expect(inputStruct).toBeDefined();

		const amount = findParam(inputStruct, "amount");
		expect(amount?.type).toBe(ABAP.Primitive.DECIMAL);
		expect(amount?.length).toBe(16);
		expect(amount?.decimal).toBe(0);

		const count = findParam(inputStruct, "count");
		expect(count?.type).toBe("t_MyInt");

		const complex = findParam(inputStruct, "complex");
		expect(complex?.type).toBe("MyComplex");

		// alias/table for MyInt created
		const alias = types.find((t: any) => t && "name" in t && t.name === "t_MyInt") as ABAP.Parameter;
		expect(alias?.type).toBe(ABAP.Primitive.INT32);
		expect(findTableType(types, "tt_MyInt")).toBeDefined();

		// complex table created (for actions we reuse _createActionType recursively to build nested)
		// For actions, nested complex calls _createActionType with name=MyComplex which creates only a structure (no table),
		// so we at least ensure the main input contains MyComplex, already checked above.

		// association param should be omitted
		expect(findParam(inputStruct, "rel")).toBeUndefined();
	});

	test("Entity actions also produce input types named t_<Entity>_<Action>_input", () => {
		const entityAction = {
			params: { "x": { kind: "element", type: CDS.Primitive.Int16 } },
			name: "DoIt",
		};
		const entity = {
			name: "svc.Item",
			elements: [{ name: "A", kind: "element", type: CDS.Primitive.String }],
			actions: [entityAction],
		};

		conv.setService({ entities: [entity] });
		const types = conv.getABAPTypes();

		const main = findStructure(types, "t_Item");
		expect(main).toBeDefined();

		const act = findStructure(types, "t_Item_DoIt_input");
		expect(act).toBeDefined();
		expect(findParam(act, "x")?.type).toBe(ABAP.Primitive.INT16);
	});
});