import IFCodeGenerator from "./IFCodeGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator, { ABAPClass } from "./ABAPGenerator";

class ModelProviderClassGeneratorV4 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { name: "" };

	public constructor(){}

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setClass(this._class);
		return generator.generate();
	}
}