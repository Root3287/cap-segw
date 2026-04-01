import { entity } from "@sap/cds";
import ABAPGenerator from "./ABAPGenerator";
import IFServiceClassGenerator from "./IFServiceClassGenerator";
import {
	Class as ABAPClass,
	ClassSectionType as ABAPClassSectionType,
	Method as ABAPMethod,
	MethodParameters as ABAPMethodParameters,
} from "../types/abap";
import { CompilerInfo } from "../types/frontend";

export default class ServiceExtensionClassGenerator implements IFServiceClassGenerator {
	private _baseGenerator: IFServiceClassGenerator;
	private _compilerInfo?: CompilerInfo;

	public constructor(baseGenerator: IFServiceClassGenerator) {
		this._baseGenerator = baseGenerator;
	}

	public setCompilerInfo(compilerInfo: CompilerInfo): void {
		this._compilerInfo = compilerInfo;
		this._baseGenerator.setCompilerInfo(compilerInfo);
	}

	public getService(): any {
		return this._baseGenerator.getService();
	}

	public getFileName(): string {
		return this._baseGenerator.getFileName().replace(/\.abap$/, "_EXT.abap");
	}

	public addEntity(entity: entity): void {
		this._baseGenerator.addEntity(entity);
	}

	public generate(): string {
		if(this._compilerInfo){
			this._baseGenerator.setCompilerInfo(this._compilerInfo);
		}

		this._baseGenerator.generate();

		const baseClass = (this._baseGenerator as any)?._class as ABAPClass | undefined;
		const baseClassName = this._baseGenerator.getFileName().replace(/\.abap$/, "");
		const abapClass: ABAPClass = {
			name: `${baseClassName}_EXT`,
			inheriting: [baseClassName],
		};

		const publicMethods = this._getRedefinitionMethods(baseClass?.publicSection?.methods);
		if(Object.keys(publicMethods).length){
			abapClass.publicSection = {
				type: ABAPClassSectionType.PUBLIC,
				methods: publicMethods,
			};
		}

		const protectedMethods = this._getRedefinitionMethods(baseClass?.protectedSection?.methods);
		if(Object.keys(protectedMethods).length){
			abapClass.protectedSection = {
				type: ABAPClassSectionType.PROTECTED,
				methods: protectedMethods,
			};
		}

		const generator = new ABAPGenerator();
		generator.setABAPClass(abapClass);
		return generator.generate();
	}

	private _getRedefinitionMethods(methods?: Record<string, ABAPMethod>): Record<string, ABAPMethod> {
		const redefinitions: Record<string, ABAPMethod> = {};
		Object.keys(methods ?? {}).forEach((methodName) => {
			const method = methods?.[methodName];
			if(!method) return;
			redefinitions[methodName] = {
				type: method.type,
				isRedefinition: true,
				code: this._createSuperCall(methodName, method),
			};
		});
		return redefinitions;
	}

	private _createSuperCall(methodName: string, method: ABAPMethod): string[] {
		const callPrefix = method?.returning ? `${method.returning.name} = ` : "";
		const callLines = [`${callPrefix}super->${methodName}(`];
		const sections: Array<[string, ABAPMethodParameters[] | undefined]> = [
			["EXPORTING", method.importing],
			["IMPORTING", method.exporting],
			["CHANGING", method.changing],
		];

		sections.forEach(([sectionName, parameters]) => {
			if(!parameters?.length) return;
			callLines.push(`\t${sectionName}`);
			parameters.forEach((parameter) => {
				callLines.push(`\t\t${parameter.name} = ${parameter.name}`);
			});
		});

		if(callLines.length === 1){
			callLines[0] += " ).";
			return callLines;
		}

		callLines.push(").");
		return callLines;
	}
}
