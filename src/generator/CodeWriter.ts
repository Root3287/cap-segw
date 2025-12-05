import IFCodeGenerator from "./IFCodeGenerator";

export default class CodeWriter implements IFCodeGenerator {
	private _indent = 0;
	private _code: string = "";

	/**
	 * Increases Code Indentation
	 * @return {CodeWriter} for method chaining
	 */
	public increaseIndent(): CodeWriter {
		this._indent++;
		return this;
	}

	/**
	 * Decreases Code Indentation
	 * @return {CodeWriter} for method chaining
	 */
	public decreaseIndent(): CodeWriter {
		if(this._indent <= 0) return this;
		this._indent--;
		return this;
	}

	/**
	 * Write a line to the buffer
	 * @param  {string}     line to write
	 * @return {CodeWriter}      for method chaining
	 */
	public writeLine(line?: string): CodeWriter {
		if(!line) line = "";
		const indentTabs = '\t'.repeat(this._indent);
		this._code += `${indentTabs}${line}\n`;
		return this;
	}

	/**
	 * Generates the code
	 * @return {string} Code from Generation
	 */
	public generate(): string {
		return this._code;
	}
}