import { entity } from "@sap/cds";

export default interface IFServiceClassGenerator {
	setClassName(name: string): void;
	addEntity(entity: entity): void;
};