import { entity } from "@sap/cds";
import { CompilerInfo } from "../types/frontend";

export default interface IFServiceClassGenerator {
	setCompilerInfo(compilerInfo: CompilerInfo): void;
	setClassName(name: string): void;
	addEntity(entity: entity): void;
};