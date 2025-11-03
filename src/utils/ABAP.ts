export class ABAP {
	/**
	 * Get an ABAP friendly version of the CSN/String object.
	 *
	 * If what is being passed in is a string it will remove all . and replace it with _
	 *
	 * IF what is being passed in is a CDS Object it will look for '@segw.name'.
	 * That exists than that take precident over the entity name.
	 * 
	 * @param  {any}    definition [description]
	 * @return {string}            [description]
	 */
	static getABAPName(definition: any): string {
		if(typeof definition === 'string' || definition instanceof String){
			return definition.toString().replace(/[\s.]+/g, '_');
		}
		let splitNamespace = definition?.name?.split?.(".");
		let name = (<any>definition)?.["@segw.name"] ?? splitNamespace[splitNamespace.length-1];
		return name;
	};

	/**
	 * Converts boolean to abap_bool
	 * @param {string { return (value} value abap_bool value
	 */
	static toABAPBool(value: boolean): string { return (value) ? "abap_true" : "abap_false"; }
}