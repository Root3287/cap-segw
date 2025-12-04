import AssociationMPCV2Writer from "../../../src/writers/AssociationMPCV2Writer";

describe("AssociationMPCV2Writer", () => {
	test("emits nav properties per association and creates constraints for FK or on-clause", () => {
		const parent = { name: "Service.Parent" };
		const targetA = { name: "Service.ChildA" };
		const targetB = { name: "Service.ChildB" };

		const associationA = {
			parent,
			_target: targetA,
			name: "ParentChildA",
			is2many: true,
			foreignKeys: {
				fk1: { name: "PARENT_ID" },
			},
		};

		const associationB = {
			parent,
			_target: targetB,
			name: "ParentChildB",
			is2one: true,
			on: [
				{ ref: ["ChildB", "ID"] },
				"=",
				{ ref: ["$self", "P_ID"] },
			],
		};

		const writer = new AssociationMPCV2Writer();
		writer.setAssociations([associationA, associationB]);

		const abap = writer.generate();

		// Navigation properties use distinct association names for each target
		expect(abap).toContain("iv_property_name = 'ParentChildA'");
		expect(abap).toContain("iv_property_name = 'ParentChildB'");

		// FK constraint emitted once
		expect(abap).toContain("iv_dependent_property = 'PARENT_ID'");

		// on-clause constraint emitted once
		expect(abap).toContain("iv_principal_property = 'ChildB.ID'");
		expect(abap).toContain("iv_dependent_property = 'P_ID'");
	});
});
