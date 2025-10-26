import IFCodeGenerator from "./IFCodeGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator, { ABAPClass } from "./ABAPGenerator";

import { entity } from "@sap/cds";

class ModelProviderClassGeneratorV2 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { name: "" };

	public constructor(){}

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);
		return generator.generate();
	}

	public setClassName(name: string): void { this._class.name = name; }

	public addEntity(entity: entity): void {};
}