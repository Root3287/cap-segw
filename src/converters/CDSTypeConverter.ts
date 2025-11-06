import * as ABAP from "../types/abap";
import * as CDS from "../types/cds";
import cds, { csn, Service, entity, struct, service } from "@sap/cds";
import { CDS as CDSUtils } from "../utils/CDS";
import { ABAP as ABAPUtils } from "../utils/ABAP";

const LOG = cds.log("segw");

export default class CDSTypeConverter {
	private _service ?: any = null;
	private _types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>  = [];

	public constructor(){ }

	public setService(service?: any){
		this._service = service;
	}

	/**
	 * Creates a type alias
	 * @param {string} name Name of the type alias
	 * @param {string} type ABAP type to alias to
	 */
	private _createTypeAlias(name: string, type: string){
		let typeName = `t_${ABAPUtils.getABAPName(name).replace(/\./g, '_')}`;
		let typeExists = this._types?.find(s => ("name" in s && s?.name === typeName) || ("structure" in s && s?.structure?.name === typeName));
		if(typeExists) return;

		this?._types?.push({
			name: typeName,
			referenceType: ABAP.ParameterReferenceType.TYPE,
			type: type
		});
		this._types?.push({
			structure: { 
				name: `t${typeName}`, 
				referenceType: ABAP.ParameterReferenceType.TYPE_STANDARD_TABLE, 
				type: typeName
			}
		});
	}

	private _createComplexType(name: string, typeStruct: any): void {
		let typeName = `t_${ABAPUtils.getABAPName(name).replace(/\./g, '_')}`;
		let typeExists = this._types?.find(s => {
			 return ("name" in s && s?.name === typeName) ||
					("structure" in s && s?.structure?.name === typeName)
		});
		if(typeExists) return;

		let abapStructure: ABAP.Structure = { name: typeName, parameters: [] };

		for(let property of typeStruct.elements){

			// This is not an primative type, but one of the following
			// TODO:  Process (<any>property)?.["@odata.type"] ??
			let propertyType = <string>(CDSUtils.cds2abap((<CDS.Primitive>property.type)));

			if((<any>property)?.["@segw.abap.type"]){
				propertyType = (<any>property)?.["@segw.abap.type"];
			}

			// - Association
			// - Composition
			// - Complex Type
			// - Type Alias
			if(propertyType === null){

				let propertyPrototype = Object.getPrototypeOf(property);
				let propertyPrototypePrimative = CDSUtils.cds2abap(propertyPrototype.type);

				let isAssociation = (
					property?.type === CDS.Primitive.Association ||
					propertyPrototype?.type === CDS.Primitive.Association
				);
				let isComposition = (
					property?.type === CDS.Primitive.Composition ||
					propertyPrototype?.type === CDS.Primitive.Composition
				);
				if(
					!propertyType &&
					property.kind === "element" &&
					(isAssociation || isComposition)
				){
					continue;
				}

				// Check if type is actually in Prototype
				// If it is it's a type alias
				if(!propertyType && property.kind === "element" && propertyPrototypePrimative){
					let pName = (property.type.split('.').length) ? property.type.split('.').at(-1) : property.type;
					propertyType = `t_${ABAPUtils.getABAPName(pName)}`;
					this._createTypeAlias(pName, propertyPrototypePrimative);
				}

				// Check if Complex Type
				if(!propertyType && property.kind === "element" && propertyPrototype?.kind === "type"){
					let pName = (property.type.split('.').length) ? property.type.split('.').at(-1) : property.type;
					propertyType = `${ABAPUtils.getABAPName(pName)}`;
					this._createComplexType(propertyType, property);
				}
			}

			let abapProperty: ABAP.Parameter = {
				name: property.name,
				referenceType: ABAP.ParameterReferenceType.TYPE,
				type: propertyType,
			};

			if(propertyType === ABAP.Primitive.DECIMAL){
				abapProperty.length = 16;
				abapProperty.decimal = 0;
			}

			abapStructure.parameters.push(abapProperty);
		}

		this._types?.push(abapStructure);
		this._types?.push({
			structure: {
				name: `t${typeName}`,
				referenceType: ABAP.ParameterReferenceType.TYPE_STANDARD_TABLE,
				type: typeName
			}
		});
	}

	/**
	 * Create Entity Type
	 * @param {string} name   Name of entity
	 * @param {csn.Entity}    entity Entity to put into an ABAP Structure
	 */
	private _createEntityType(name: string, entity: any): void {
		let typeName = `t_${ABAPUtils.getABAPName(entity).replace(/\./g, '_')}`;
		let typeExists = this._types?.find(s => ("name" in s && s?.name === typeName) || ("structure" in s && s?.structure?.name === typeName));
		if(typeExists) return;

		// Check if pre-defined. If so we create a type alias.
		if((<any>entity)?.["@segw.abap.type"]){
			this._createTypeAlias(name, (<any>entity)?.["@segw.abap.type"]);
			return;
		}

		let abapStructure: ABAP.Structure = { name: typeName, parameters: [] };

		// Generate for local
		for(let property of entity.elements){
			// This is not an primative type, but one of the following
			// TODO:  Process (<any>property)?.["@odata.type"] ?? 
			let propertyType = <string>(CDSUtils.cds2abap((<CDS.Primitive>property.type)));
			
			if((<any>property)?.["@segw.abap.type"]){
				propertyType = (<any>property)?.["@segw.abap.type"];
			}

			// - Association
			// - Composition
			// - Complex Type
			// - Type Alias
			if(propertyType === null){

				let propertyPrototype = Object.getPrototypeOf(property);
				let propertyPrototypePrimative = CDSUtils.cds2abap(propertyPrototype.type);

				let isAssociation = (
					property?.type === CDS.Primitive.Association || 
					propertyPrototype?.type === CDS.Primitive.Association
				);
				let isComposition = (
					property?.type === CDS.Primitive.Composition || 
					propertyPrototype?.type === CDS.Primitive.Composition
				);
				if(
					!propertyType && 
					property.kind === "element" && 
					(isAssociation || isComposition)
				){
					continue;
				}

				// Check if type is actually in Prototype
				// If it is it's a type alias
				if(!propertyType && property.kind === "element" && propertyPrototypePrimative){
					let pName = (property.type.split('.').length) ? property.type.split('.').at(-1) : property.type;
					propertyType = `t_${ABAPUtils.getABAPName(pName)}`;
					this._createTypeAlias(pName, propertyPrototypePrimative);
				}

				// Check if Complex Type
				if(!propertyType && property.kind === "element" && propertyPrototype?.kind === "type"){
					let pName = (property.type.split('.').length) ? property.type.split('.').at(-1) : property.type;
					propertyType = `t_${ABAPUtils.getABAPName(pName)}`;
					this._createComplexType(ABAPUtils.getABAPName(pName), property);
				}
			}

			let abapProperty: ABAP.Parameter = {
				name: property.name,
				referenceType: ABAP.ParameterReferenceType.TYPE,
				type: propertyType,
			};

			if(propertyType === ABAP.Primitive.DECIMAL){
				abapProperty.length = 16;
				abapProperty.decimal = 0;
			}
			
			abapStructure.parameters.push(abapProperty);
		}

		this._types?.push(abapStructure);
		this._types?.push({
			structure: { 
				name: `t${typeName}`, 
				referenceType: ABAP.ParameterReferenceType.TYPE_STANDARD_TABLE, 
				type: typeName 
			}
		});
	}

	/**
	 * Create an Action Structure
	 * @param {string} name   Name of Action Structure
	 * @param {csn.Action}    action Action to write out
	 */
	private _createActionType(name: string, action: any){
		let typeName = `t_${ABAPUtils.getABAPName(name).replace(/\./g, '_')}_input`;

		if(typeName.length > 30){
			LOG.warn(`${typeName} is too long. Consider shortening with '@segw.abap.name'`);
		}

		let typeExists = this._types?.find(s => {
			 return ("name" in s && s?.name === typeName) ||
					("structure" in s && s?.structure?.name === typeName)
		});
		if(typeExists) return;

		if(!action?.params) return;

		let abapStructure: ABAP.Structure = { name: typeName, parameters: [] };

		// Generate for local
		for(let paramKey in action.params){
			let param = action.params[paramKey];
			// This is not an primative type, but one of the following
			// TODO:  Process (<any>property)?.["@odata.type"] ?? 
			let paramType = <string>(CDSUtils.cds2abap((<CDS.Primitive>param.type)));
			
			if((<any>param)?.["@segw.abap.type"]){
				paramType = (<any>param)?.["@segw.abap.type"];
			}

			// - Association
			// - Composition
			// - Complex Type
			// - Type Alias
			if(paramType === null){

				let paramPrototype = Object.getPrototypeOf(param);
				let paramPrototypePrimative = CDSUtils.cds2abap(paramPrototype.type);

				let isAssociation = (
					param?.type === CDS.Primitive.Association || 
					paramPrototype?.type === CDS.Primitive.Association
				);
				let isComposition = (
					param?.type === CDS.Primitive.Composition || 
					paramPrototype?.type === CDS.Primitive.Composition
				);
				if(
					!paramType && 
					param.kind === "element" && 
					(isAssociation || isComposition)
				){
					continue;
				}

				// Check if type is actually in Prototype
				// If it is it's a type alias
				if(!paramType && param.kind === "param" && paramPrototypePrimative){
					let pName = (param.type.split('.').length) ? param.type.split('.').at(-1) : param.type;
					paramType = `t_${ABAPUtils.getABAPName(pName)}`;
					this._createTypeAlias(pName, paramPrototypePrimative);
				}

				// Check if Complex Type
				if(!paramType && param.kind === "param" && paramPrototype?.kind === "type"){
					let pName = (param.type.split('.').length) ? param.type.split('.').at(-1) : param.type;
					paramType = `t_${ABAPUtils.getABAPName(pName)}`;
					this._createComplexType(ABAPUtils.getABAPName(pName), param);
				}
			}

			let abapProperty: ABAP.Parameter = {
				name: ABAPUtils.getABAPName(paramKey),
				referenceType: ABAP.ParameterReferenceType.TYPE,
				type: paramType,
			};

			if(paramType === ABAP.Primitive.DECIMAL){
				abapProperty.length = 16;
				abapProperty.decimal = 0;
			}
			
			abapStructure.parameters.push(abapProperty);
		}

		this._types?.push(abapStructure);
	}

	/**
	 * Get ABAP Types that got generated
	 * @return {Array} ABAP Types
	 */
	public getABAPTypes(): Array<ABAP.Structure | ABAP.Parameter | ABAP.Table> {
		this._types = [];
		for(let action of this._service?.actions ?? []){
			let actionName = (<any>action)?.["@segw.abap.name"] ?? ABAPUtils.getABAPName(action);
			this._createActionType(actionName, action);
		}
		for(let entity of this._service?.entities ?? []){
			this._createEntityType(ABAPUtils.getABAPName(entity), entity);

			for(let action of entity?.actions ?? []){
				let entityActionName = 	(<any>action)?.["@segw.abap.name"] ??
										ABAPUtils.getABAPName(action) ??
										`${ABAPUtils.getABAPName(entity)}.${ABAPUtils.getABAPName(action)}`;
				this._createActionType(entityActionName, action);
			}
		}
		return this._types;
	}
}