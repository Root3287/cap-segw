import { entity, struct } from "@sap/cds";
import { CompilerInfo } from "../types/frontend";
import IFCodeGenerator from "./IFCodeGenerator";

export default interface IFServiceClassGenerator extends IFCodeGenerator {
	/**
	 * Set Compiler Information from the front end
	 * @param {CompilerInfo} compilerInfo Frontend compiler information
	 */
	setCompilerInfo(compilerInfo: CompilerInfo): void;

	/**
	 * Resolve the service from CSN/CSDL metadata
	 */
	getService(): any;
	
	/**
	 * Get Filename
	 */
	getFileName(): string;

	/**
	 * Add an entity to be process
	 * @param {entity} entity Entity to be processed
	 */
	addEntity(entity: entity): void;
};
