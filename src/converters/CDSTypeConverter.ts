import * as ABAP from "../types/abap";
import * as CDS from "../types/cds";
import cds, { csn, Service, entity, struct, service } from "@sap/cds";
import { CDS as CDSUtils } from "../utils/CDS";
import { ABAP as ABAPUtils } from "../utils/ABAP";

export default class CDSTypeConverter {
	private _service ?: any = null;
	private _types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>  = [];

	public constructor(){ }

	public setService(service?: any){
		this._service = service;
	}

	private _createType(entity: any , name: string): void {
		let typeName = `t_${name}`;

		let checkIfTypeExists = (type: string) => {
			let existsInStructures = this._types?.find(s => "name" in s && s?.name === type);
			let existsInTypeAlias = this._types?.find(s => "name" in s && s?.name === type);
			return existsInStructures || existsInTypeAlias;
		}

		let handleTypeAlias = (propertyType: string, propertyPrototypePrimative: string) => {
			if(checkIfTypeExists(propertyType)) return;

			this._types?.push({
				name: propertyType,
				referenceType: ABAP.ParameterReferenceType.TYPE,
				type: propertyPrototypePrimative
			});
			this._types?.push({
				structure: { 
					name: `t${propertyType}`, 
					referenceType: ABAP.ParameterReferenceType.TYPE_STANDARD_TABLE, 
					type: propertyType 
				}
			});
		};

		if(checkIfTypeExists(typeName)){
			return;
		}

		// Check if pre-defined. If so we create a type alias.
		if((<any>entity)?.["@segw.abap.type"]){
			this._types?.push({
				name: typeName,
				referenceType: ABAP.ParameterReferenceType.TYPE,
				type: (<any>entity)?.["@segw.abap.type"]
			})
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
					propertyType = `t_${ABAPUtils.getABAPName(property.type)}`;
					handleTypeAlias(propertyType, propertyPrototypePrimative);
				}

				// Check if Complex Type
				if(!propertyType && property.kind === "element" && propertyPrototype?.kind === "type"){
					propertyType = `t_${ABAPUtils.getABAPName(property.type)}`;
					this._createType(property, property.type);
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

	public getABAPTypes(): Array<ABAP.Structure | ABAP.Parameter | ABAP.Table> {
		this._types = [];
		for(let entity of this._service?.entities ?? []){
			this._createType(entity, ABAPUtils.getABAPName(entity));
		}
		return this._types;
	}
}