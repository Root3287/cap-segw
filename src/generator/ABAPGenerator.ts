import IFCodeGenerator from "./IFCodeGenerator";
import CodeWriter from "./CodeWriter";

export enum ABAPMethodType {
	STATIC = "CLASS-METHOD",
	MEMBER = "METHOD",
};

export enum ABAPMethodParameterPassBy {
	REFERENCE = "REFERENCE",
	VALUE = "VALUE",
}

export enum ABAPParameterReferenceType {
	TYPE = "TYPE",
	TYPE_REF = "TYPE REF TO",
	LIKE = "LIKE",
};

export type ABAPMethodParameters = {
	passBy?: ABAPMethodParameterPassBy;
	name: string;
	referenceType: ABAPParameterReferenceType;
	type: string;
};

export type ABAPMethod = {
	type: ABAPMethodType;
	name: string;
	isRedefinition?: boolean;
	importing?: ABAPMethodParameters[];
	exporting?: ABAPMethodParameters[];
	changing?: ABAPMethodParameters[];
	returning?: ABAPMethodParameters;
	raising?: string[];
	code?: string[];
};

export enum ABAPParameterType {
	STATIC = "CLASS-DATA",
	MEMBER = "DATA"
};

export type ABAPParameter = {
	parameterType: ABAPParameterType;
	name: string;
	referenceType: ABAPParameterReferenceType;
	type: string;
};

export type ABAPStructure = {
	name: string;
	parameters: ABAPParameter[];
};

export enum ABAPClassSectionType {
	PUBLIC = "PUBLIC",
	PROTECTED = "PROTECTED",
	PRIVATE = "PRIVATE"
};

export type ABAPClassSection = {
	type: ABAPClassSectionType;
	structures?: ABAPStructure[];
	tables?: string[];
	parameters?: ABAPParameter[];
	methods?: ABAPMethod[];
};

export type ABAPClass = {
	name: string;
	extending?: string;
	inheriting?: string[];
	interfaces?: string[];
	isAbstract?: boolean;
	isFinal?: boolean;
	publicSection?: ABAPClassSection;
	protectedSection?: ABAPClassSection;
	privateSection?: ABAPClassSection;
};

export default class ABAPGenerator implements IFCodeGenerator {
	private _class: ABAPClass = {
		name: "",
	};
	private _writer: CodeWriter = new CodeWriter();

	public setABAPClass(abapClass: ABAPClass){
		this._class = abapClass;
	}

	public generate(): string {
		this._writer = new CodeWriter();

		this._writeDefinition();
		this._writer.writeLine("");
		this._writeImplementation();

		return this._writer.generate();
	}

	/**
	 * Write ABAP Class Definition
	 */
	private _writeDefinition(): void {
		this._writer.writeLine(`CLASS ${this._class.name} DEFINITION`);
		this._writer.increaseIndent();
		this._writer.writeLine("PUBLIC")
		this._class?.inheriting?.forEach?.((inhertingClass) => {
			this._writer.writeLine(`INHERTING FROM ${inhertingClass}`);
		});
		if(!this._class.isAbstract) this._writer.writeLine("ABSTRACT");
		if(!this._class.isFinal) this._writer.writeLine("FINAL");
		this._writer.writeLine("CREATE PUBLIC.");
		this._writer.decreaseIndent();
		
		this._writeSectionDefinition(this._class?.publicSection);
		this._writeSectionDefinition(this._class?.protectedSection);
		this._writeSectionDefinition(this._class?.privateSection);
		
		this._writer.writeLine(`ENDCLASS.`);
	}

	private _writeSectionDefinition(section?: ABAPClassSection): void {
		if(!section) return;
		this._writer.writeLine(`${section.type} SECTION.`);

		if(section.type === ABAPClassSectionType.PUBLIC){
			this._class?.interfaces?.forEach?.((interfaceClass) => {
				this._writer.writeLine(`INTERFACE ${interfaceClass}`);
			});
		}

		// TODO: Write Types
		
		
		// TODO: Write Paramters
		section?.parameters?.forEach((parameter) => {
			this._writeParameters(parameter);
			this._writer.writeLine("");
		});
		
		// TODO: Write Methods
		section?.methods?.forEach((method)=>{
			this._writeMethodDefinition(method);
			this._writer.writeLine("");
		});
	}

	private _writeParameters(parameter: ABAPParameter){
		this._writer.increaseIndent();
		this._writer.writeLine(`${parameter.parameterType} ${parameter.name} ${parameter.referenceType} ${parameter.type}.`);
		this._writer.decreaseIndent();
	}

	/**
	 * Writes Method Defintion
	 * 
	 * Note: Current implementation will trim the method names
	 * to 30 chracters. This is an limitation of ABAP itself.
	 * In the future we may implement throwing an error that 
	 * is bypassable with a parameter like `bypass_length`.
	 * 
	 * @param {ABAPMethod} method Method to write
	 */
	private _writeMethodDefinition(method: ABAPMethod): void {
		this._writer.increaseIndent();
		if(method.isRedefinition){
			this._writer.writeLine(`${method.type}S ${method.name.substring(0,30)} REDEFINITION.`);
			this._writer.decreaseIndent();
			return;
		}

		this._writer.writeLine(`${method.type}S ${method.name}`);
		
		let writeMethodParameters = (methodSection: string, parameters?: ABAPMethodParameters[]): void => {
			if(!parameters) return;

			this._writer.increaseIndent();
			this._writer.writeLine(methodSection);
			this._writer.increaseIndent();

			parameters.forEach((param) => {
				if(!param?.passBy) param.passBy = ABAPMethodParameterPassBy.REFERENCE;
				this._writer.writeLine(`!${param.passBy}(${param.name}) ${param.referenceType} ${param.type}`);
			});

			this._writer.decreaseIndent();
			this._writer.decreaseIndent();
		}
		
		writeMethodParameters("IMPORTING", method?.importing);
		writeMethodParameters("EXPORTING", method?.exporting);
		writeMethodParameters("CHANGING", method?.changing);
		if(method?.returning){
			method.returning.passBy = ABAPMethodParameterPassBy.VALUE;
			let returningParam: ABAPMethodParameters[] = [method.returning];
			writeMethodParameters("RETURNING", returningParam);
		}

		if(method?.raising){
			this._writer.writeLine("RAISING").increaseIndent();
			method?.raising?.forEach?.((err) => {
				this._writer.writeLine(err);
			});
			this._writer.decreaseIndent();
		}
		this._writer.writeLine(".");
		this._writer.decreaseIndent();
	}

	/**
	 * Write ABAP Class Implementation
	 */
	private _writeImplementation(): void {
		this._writer.writeLine(`CLASS ${this._class.name} IMPLEMENTATION.`);
		this._writer.increaseIndent();

		let methods: ABAPMethod[] = [];
		if(this._class?.publicSection?.methods)
			methods.push(...this._class?.publicSection?.methods);
		if(this._class?.protectedSection?.methods)
			methods.push(...this._class?.protectedSection?.methods);
		if(this._class?.privateSection?.methods)
			methods.push(...this._class?.privateSection?.methods);

		methods.forEach((method) => {
			this._writeMethodImplementation(method);
		})

		this._writer.decreaseIndent();
		this._writer.writeLine(`ENDCLASS.`);
	}

	/**
	 * Write Method Implmentation
	 *
	 * Note: Current implementation will trim the method names
	 * to 30 chracters. This is an limitation of ABAP itself.
	 * In the future we may implement throwing an error that 
	 * is bypassable with a parameter like `bypass_length`.
	 * 
	 * @param {ABAPMethod} method Method to write
	 */
	private _writeMethodImplementation(method: ABAPMethod): void {
		this._writer.writeLine(`METHOD ${method.name.substring(0,30)}.`).increaseIndent();
		method?.code?.forEach((c) => {
			this._writer.writeLine(c);
		})
		this._writer.decreaseIndent().writeLine(`ENDMETHOD.`);
	}
}