import IFCodeGenerator from "./IFCodeGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import { Class as ABAPClass } from "../types/abap";
import { CompilerInfo } from "../types/frontend";

import { entity } from "@sap/cds";

export default class DataProviderClassGeneratorV4 implements IFCodeGenerator, IFServiceClassGenerator {
	private _class: ABAPClass = { name: "" };

	private _compilerInfo?: CompilerInfo;

	public constructor(){}

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);
		return generator.generate();
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public setClassName(name: string): void { this._class.name = name; }

	public addEntity(entity: entity): void {};
}