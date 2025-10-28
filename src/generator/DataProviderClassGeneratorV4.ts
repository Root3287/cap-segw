import IFServiceClassGenerator from "./IFServiceClassGenerator";
import ABAPGenerator from "./ABAPGenerator"; 
import { Class as ABAPClass } from "../types/abap";
import { CompilerInfo } from "../types/frontend";
import { ABAP as ABAPUtils } from "../utils/ABAP";

import { entity, struct } from "@sap/cds";

export default class DataProviderClassGeneratorV4 implements IFServiceClassGenerator {
	private _class: ABAPClass = { name: "" };

	private _compilerInfo?: CompilerInfo;

	public constructor(){}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
	}

	public getFileName(): string { 
		const namespace = Object.keys(this._compilerInfo?.csdl)[3];
		const service = this._compilerInfo?.csn.services[namespace];
		return `ZCL_${ABAPUtils.getABAPName(service)}_DPC.abap`;
	}

	public addEntity(entity: entity): void {};

	public generate(): string {
		let generator = new ABAPGenerator();
		generator.setABAPClass(this._class);
		return generator.generate();
	}
}