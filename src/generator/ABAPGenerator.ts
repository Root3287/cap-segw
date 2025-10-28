import IFCodeGenerator from "./IFCodeGenerator";
import CodeWriter from "./CodeWriter";
import * as ABAP from "../types/abap";

export default class ABAPGenerator implements IFCodeGenerator {
	private _class: ABAP.Class = {
		name: "",
	};
	private _writer: CodeWriter = new CodeWriter();

	public setABAPClass(abapClass: ABAP.Class){
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
		if(this._class?.isAbstract) this._writer.writeLine("ABSTRACT");
		if(this._class?.isFinal) this._writer.writeLine("FINAL");
		this._writer.writeLine("CREATE PUBLIC.");
		this._writer.decreaseIndent().writeLine();
		
		this._writeSectionDefinition(this._class?.publicSection);
		this._writeSectionDefinition(this._class?.protectedSection);
		this._writeSectionDefinition(this._class?.privateSection);
		
		this._writer.writeLine(`ENDCLASS.`);
	}

	private _writeSectionDefinition(section?: ABAP.ClassSection): void {
		if(!section) return;
		this._writer.writeLine(`${section.type} SECTION.`);

		if(section.type === ABAP.ClassSectionType.PUBLIC){
			this._class?.interfaces?.forEach?.((interfaceClass) => {
				this._writer.increaseIndent().writeLine(`INTERFACE ${interfaceClass}.`).decreaseIndent();
			});
		}

		// Write Types
		section?.structures?.forEach((structure) => {
			this._writeStructure(structure);
			this._writer.writeLine();
		});

		// Write Type Alias
		section?.typeAlias?.forEach((alias) => {
			this._writeTypeAlias(alias);
			this._writer.writeLine();
		})

		// Table Types
		section?.tables?.forEach((table) => {
			this._writeTableType(table);
			this._writer.writeLine();
		});

		// Parameters
		section?.parameters?.forEach((parameter) => {
			this._writeParameters(parameter);
			this._writer.writeLine();
		});
		
		// Write Methods
		section?.methods?.forEach((method)=>{
			this._writeMethodDefinition(method);
			this._writer.writeLine();
		});
	}

	/**
	 * Write internal structure type
	 * 
	 * @param {ABAPStructure} structure structure to write
	 */
	private _writeStructure(structure: ABAP.Structure){
		this._writer.increaseIndent();
		this._writer.writeLine(`TYPES: BEGIN OF ${structure.name},`).increaseIndent();
		structure.parameters?.forEach((parameter) => {
			let line = `${parameter.name} ${parameter.referenceType} ${parameter.type}`;
			if(parameter?.length) line += ` length ${parameter.length}`;
			this._writer.writeLine(`${line},`);
		});
		this._writer.decreaseIndent().writeLine(`END OF ${structure.name}.`);
		this._writer.decreaseIndent();
	}

	/**
	 * Write type alias
	 * @param {Parameter} alias Type Alias to write
	 */
	private _writeTypeAlias(alias: ABAP.Parameter){
		this._writer.writeLine(`TYPES: ${alias.name} ${alias.referenceType} ${alias.type}.`);
	}

	/**
	 * Write Internal Table Type
	 * @param {ABAPTable} tables Internal Table type to write
	 */
	private _writeTableType(table: ABAP.Table){
		table.key ??= "";
		this._writer.increaseIndent();
		this._writer.writeLine(`TYPE ${table.structure.name} ${table.structure.referenceType} ${table.structure.type} ${table.key}.`);
		this._writer.decreaseIndent();
	}

	/**
	 * Write Member Parameters
	 * @param {ABAPParameter} parameter parameter to write
	 */
	private _writeParameters(parameter: ABAP.Parameter){
		this._writer.increaseIndent();
		let line = `${parameter.parameterType} ${parameter.name} ${parameter.referenceType} ${parameter.type}`;
		if(parameter?.length) line += ` length ${parameter.length}`;
		if(parameter?.value) line += ` value ${parameter.value}`;
		this._writer.writeLine(`${line}.`);
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
	private _writeMethodDefinition(method: ABAP.Method): void {
		this._writer.increaseIndent();

		let methodDefinition = `${method.type}S ${method.name}`;
		if(method.isRedefinition) methodDefinition += " REDEFINITION.";
		if(method.isFinal) methodDefinition += " FINAL";
		this._writer.writeLine(methodDefinition);

		if(method.isRedefinition){
			this._writer.decreaseIndent();
			return;
		}
		
		let writeMethodParameters = (methodSection: string, parameters?: ABAP.MethodParameters[]): void => {
			if(!parameters) return;

			this._writer.increaseIndent();
			this._writer.writeLine(methodSection);
			this._writer.increaseIndent();

			parameters.forEach((param) => {
				if(!param?.passBy) param.passBy = ABAP.MethodParameterPassBy.REFERENCE;
				let line = `${param.passBy}(${param.name}) ${param.referenceType} ${param.type}`;
				if(param?.isOptional) line += " optional";
				this._writer.writeLine(`!${line}`);
			});

			this._writer.decreaseIndent();
			this._writer.decreaseIndent();
		}
		
		writeMethodParameters("IMPORTING", method?.importing);
		writeMethodParameters("EXPORTING", method?.exporting);
		writeMethodParameters("CHANGING", method?.changing);
		if(method?.returning){
			method.returning.passBy = ABAP.MethodParameterPassBy.VALUE;
			let returningParam: ABAP.MethodParameters[] = [method.returning];
			writeMethodParameters("RETURNING", returningParam);
		}

		if(method?.raising){
			this._writer.increaseIndent();
			this._writer.writeLine("RAISING").increaseIndent();
			method?.raising?.forEach?.((err) => {
				this._writer.writeLine(err);
			});
			this._writer.decreaseIndent();
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

		let methods: ABAP.Method[] = [];
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
	private _writeMethodImplementation(method: ABAP.Method): void {
		this._writer.writeLine(`METHOD ${method.name}.`).increaseIndent();
		method?.code?.forEach((c) => {
			this._writer.writeLine(c);
		})
		this._writer.decreaseIndent().writeLine(`ENDMETHOD.`).writeLine();
	}
}