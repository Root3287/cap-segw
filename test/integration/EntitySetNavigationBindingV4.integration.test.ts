import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: V4 entity set navigation bindings", () => {
	test("emits entity set navigation property bindings for V4 associations", () => {
		const model = `
			service Test {
				@segw.set.name: 'PARENTS_SET'
				entity Parent {
					key ID: UUID;

					@segw.abap.name: 'TO_CHILDREN'
					children: Composition of many Child on children.parent = $self;
				}

				@segw.set.name: 'CHILDREN_SET'
				entity Child {
					key ID: UUID;

					@segw.abap.name: 'TO_PARENT'
					parent: Association to Parent;
				}
			};
		`;

		const csn = cds.linked(cds.parse.cdl(model));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0] as string;

		expect(mpc).toContain("entity_set = entity_type->create_entity_set( 'PARENTS_SET' ).");
		expect(mpc).toContain("entity_set = entity_type->create_entity_set( 'CHILDREN_SET' ).");

		expect(mpc).toContain("iv_navigation_property_path = 'TO_CHILDREN'");
		expect(mpc).toContain("iv_target_entity_set = 'CHILDREN_SET'");

		expect(mpc).toContain("iv_navigation_property_path = 'TO_PARENT'");
		expect(mpc).toContain("iv_target_entity_set = 'PARENTS_SET'");
	});
});
