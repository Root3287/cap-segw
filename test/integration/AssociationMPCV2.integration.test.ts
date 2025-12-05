import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: AssociationMPCV2Writer", () => {
	test("emits constraints for multiple on-clause pairs and correct association names", () => {
		const model = `
			service AssocService {
				entity Parent {
					key ID: Integer;
					key client: String;
				};

				entity Child {
					key ID: Integer;
					key client: String;
					parent_ID: Integer;
					parent: Association to Parent on parent.ID = $self.parent_ID and parent.client = $self.client;
				};
			};
		`;

		const csn = cds.linked(cds.parse.cdl(model));
		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "2" }));

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0] as string;
		expect(mpc).toBeTruthy();

		// Association name is derived from child entity (owner) and target
		expect(mpc).toContain("iv_association_name = |Child_Parent|");

		// Two constraints emitted from the two equality pairs
		const constraintCount = (mpc.match(/ref_constraint->add_property/g) ?? []).length;
		expect(constraintCount).toBe(2);

		// Constraints use principal/dependent properties from the on-clause
		expect(mpc).toContain("iv_principal_property = 'parent.ID'");
		expect(mpc).toContain("iv_dependent_property = 'parent_ID'");
		expect(mpc).toContain("iv_principal_property = 'parent.client'");
		expect(mpc).toContain("iv_dependent_property = 'client'");

		// Navigation property uses the association name for this parent/target pair
		expect(mpc).toContain("iv_association_name = 'Child_Parent'");
	});
});
