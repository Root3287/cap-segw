export class ABAP {
	static getABAPName(definition: any): string {
		if(typeof definition === 'string' || definition instanceof String){
			return definition.toString().replace(/[\s.]+/g, '_');
		}
		let splitNamespace = definition?.name?.split?.(".");
		let name = (<any>definition)?.["@segw.name"] ?? splitNamespace[splitNamespace.length-1];
		return name;
	};
	static toABAPBool(value: boolean): string { return (value) ? "abap_true" : "abap_false"; }
}