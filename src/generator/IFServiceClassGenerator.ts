import { entity, struct } from "@sap/cds";
import { CompilerInfo } from "../types/frontend";
import IFCodeGenerator from "./IFCodeGenerator";

export default interface IFServiceClassGenerator extends IFCodeGenerator {
	setCompilerInfo(compilerInfo: CompilerInfo): void;
	getFileName(): void;
	addEntity(entity: entity): void;
};