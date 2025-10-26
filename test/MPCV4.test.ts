import ModelProviderClassGeneratorV4 from "../src/generator/ModelProviderClassGeneratorV4";

import { entity } from "@sap/cds";

describe("MVC-V4", () => {
	let mpc: ABAPGenerator;
	
	beforeEach(() => {
		mpc = new ModelProviderClassGeneratorV4();
		mpc.setClassName("ZTEST_MPC");
	})

	test("Basic Print Out", () => {
		const code = mpc.generate();
		// console.log(code);
		expect(code).not.toBeNull();
	});

	test("Basic Entity Out", () => {
		let entity: entity = {
			name: "Book",
		};
		mpc.addEntity(entity);

		const code = mpc.generate();
		console.log(code);
		expect(code).not.toBeNull();
	});
});