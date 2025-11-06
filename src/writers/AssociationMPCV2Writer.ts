import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { getCardinalityPair } from "../utils/Cardinality";

import { entity } from "@sap/cds";

export default class AssociationMPCV2Writer implements IFCodeGenerator {
	
	private _writer: CodeWriter = new CodeWriter();
	private _associations:any = [];
	private _className: string = ""; 

	public setAssociations(association: any){
		this._associations = association;
	}

	private _writeHeader(){
		this._writer.writeLine(`DATA:`).increaseIndent();
		this._writer.writeLine(`annotation type ref to /iwbep/if_mgw_odata_annotation,`);
		this._writer.writeLine(`entity_type type ref to /iwbep/if_mgw_odata_entity_typ,`);
		this._writer.writeLine(`association type ref to /iwbep/if_mgw_odata_assoc,`);
		this._writer.writeLine(`ref_constraint type ref to /iwbep/if_mgw_odata_ref_constr,`);
		this._writer.writeLine(`assoc_set type ref to /iwbep/if_mgw_odata_assoc_set,`);
		this._writer.writeLine(`nav_property type ref to /iwbep/if_mgw_odata_nav_prop.`)
		this._writer.decreaseIndent().writeLine();
	}

	public generate(): string {
		this._writer = new CodeWriter();
		this._writeHeader();

		let visitedNodes: any[] = [];
		for(let association of this._associations){
			let associationName = association?.["@segw.association.name"] ?? `${ABAPUtils.getABAPName(association.parent)}_${ABAPUtils.getABAPName(association._target)}`;
			let parentName = ABAPUtils.getABAPName(association.parent);
			let targetName = ABAPUtils.getABAPName(association._target);

			if((<any>association)?.["@segw.association.ignore"]) continue;

			// We already process the association
			if(visitedNodes.find((nodes) => nodes.parent === association.parent && nodes.target === association._target ))
				continue;

			let inverseAssociation = this._associations.find(
				(node: any) => node._target === association.parent && node.parent === association._target
			);

			let [leftCard, rightCard] = <any>(getCardinalityPair(association, inverseAssociation));

			// Create the association
			this._writer.writeLine(`association = model->create_association(`).increaseIndent();
				this._writer.writeLine(`iv_association_name = |${associationName}|`);
				this._writer.writeLine(`iv_left_type = '${parentName}'`);
				this._writer.writeLine(`iv_right_type = '${targetName}'`);
				this._writer.writeLine(`iv_left_card = '${leftCard}'`);
				this._writer.writeLine(`iv_right_card = '${rightCard}'`);
				this._writer.writeLine(`iv_def_assoc_set = abap_false`);
			this._writer.decreaseIndent().writeLine(`).`);

			// Create the Contraints
			// TODO: Handle many constraints
			if(association?.foreignKeys){
				this._writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				this._writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				this._writer.writeLine(`iv_principal_property = '${association.name}'`);
				this._writer.writeLine(`iv_dependent_property = '${(<any>Object.values(association?.foreignKeys)?.[0])?.name}'`);
				this._writer.decreaseIndent().writeLine(`).`);
			}
			if(association?.on){
				let principalProperty = association.on[0].ref.slice(1).join('.');
				let dependentProperty = association.on[2].ref.filter((item: string) => item !== "$self")[0];
				this._writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				this._writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				this._writer.writeLine(`iv_principal_property = '${principalProperty}'`);
				this._writer.writeLine(`iv_dependent_property = '${dependentProperty}'`);
				this._writer.decreaseIndent().writeLine(`).`);
			}

			// Create Association Set
			let getEntitySetName = (entity: entity): string => (<any>entity)?.["@segw.set.name"] ?? `${ABAPUtils.getABAPName(entity)}Set`;
			let associationSetName = (<any>association)?.["@segw.set.name"] ?? `${associationName}_set`;
			this._writer.writeLine(`assoc_set->create_association_set(`).increaseIndent();
			this._writer.writeLine(`iv_association_set_name = '${associationSetName}'`);
			this._writer.writeLine(`iv_left_entity_set_name = '${getEntitySetName(association.parent)}'`);
			this._writer.writeLine(`iv_right_entity_set_name = '${getEntitySetName(association._target)}'`);
			this._writer.writeLine(`iv_association_name = '${associationName}'`);
			this._writer.decreaseIndent().writeLine(').');

			this._writer.writeLine();

			// Since we worked both ways, we can marked this as 'complete'.
			visitedNodes.push({ 
				assocationName: associationName, 
				parent: association.parent, 
				target: association._target 
			});
			visitedNodes.push({ 
				assocationName: associationName,
				parent: association._target, 
				target: association.parent 
			});
		}

		for(let association of this._associations){
			let propertyName = association?.["@segw.name"] ?? association.name;
			let abapName = association?.["@segw.abap.name"] ?? association.name;
			let associationName = visitedNodes.find(node => node.parent === association.parent)?.assocationName;
			this._writer.writeLine(`entity_type = model->get_entity_type( iv_entity_name = '${ABAPUtils.getABAPName(association.parent)}' ).`);
			this._writer.writeLine(`nav_property = entity_type->create_navigation_property(`).increaseIndent();
			this._writer.writeLine(`iv_property_name = '${propertyName}'`);
			this._writer.writeLine(`iv_abap_fieldname = '${abapName}'`);
			this._writer.writeLine(`iv_association_name = '${associationName}'`);
			this._writer.decreaseIndent().writeLine(`).`).writeLine();
		}
		return this._writer.generate();
	}
}