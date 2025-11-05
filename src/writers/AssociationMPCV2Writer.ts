import CodeWriter from "../generator/CodeWriter";
import IFCodeGenerator from "../generator/IFCodeGenerator";

import { ABAP as ABAPUtils } from "../utils/ABAP";
import { CDS as CDSUtils } from "../utils/CDS";

import { getCardinalityPair } from "../utils/Cardinality";

import { entity } from "@sap/cds";

export default class AssociationMPCV2Writer implements IFCodeGenerator {
	
	private _associations:any = [];;
	private _className: string = ""; 

	public setAssociations(association: any){
		this._associations = association;
	}

	private _writeHeader(writer: CodeWriter){
		writer.writeLine(`DATA:`).increaseIndent();
		writer.writeLine(`annotation type ref to /iwbep/if_mgw_odata_annotation,`);
		writer.writeLine(`entity_type type ref to /iwbep/if_mgw_odata_entity_typ,`);
		writer.writeLine(`association type ref to /iwbep/if_mgw_odata_assoc,`);
		writer.writeLine(`ref_constraint type ref to /iwbep/if_mgw_odata_ref_constr,`);
		writer.writeLine(`assoc_set type ref to /iwbep/if_mgw_odata_assoc_set,`);
		writer.writeLine(`nav_property type ref to /iwbep/if_mgw_odata_nav_prop.`)
		writer.decreaseIndent().writeLine();
	}

	public generate(): string {
		let writer = new CodeWriter();
		this._writeHeader(writer);

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
			writer.writeLine(`association = model->create_association(`).increaseIndent();
				writer.writeLine(`iv_association_name = |${associationName}|`);
				writer.writeLine(`iv_left_type = '${parentName}'`);
				writer.writeLine(`iv_right_type = '${targetName}'`);
				writer.writeLine(`iv_left_card = '${leftCard}'`);
				writer.writeLine(`iv_right_card = '${rightCard}'`);
				writer.writeLine(`iv_def_assoc_set = abap_false`);
			writer.decreaseIndent().writeLine(`).`);

			// Create the Contraints
			// TODO: Handle many constraints
			if(association?.foreignKeys){
				writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				writer.writeLine(`iv_principal_property = '${association.name}'`);
				writer.writeLine(`iv_dependent_property = '${(<any>Object.values(association?.foreignKeys)?.[0])?.name}'`);
				writer.decreaseIndent().writeLine(`).`);
			}
			if(association?.on){
				let principalProperty = association.on[0].ref.slice(1).join('.');
				let dependentProperty = association.on[2].ref.filter((item: string) => item !== "$self")[0];
				writer.writeLine(`ref_constraint = association->create_ref_constraint( ).`);
				writer.writeLine(`ref_constraint->add_property(`).increaseIndent();
				writer.writeLine(`iv_principal_property = '${principalProperty}'`);
				writer.writeLine(`iv_dependent_property = '${dependentProperty}'`);
				writer.decreaseIndent().writeLine(`).`);
			}

			// Create Association Set
			let getEntitySetName = (entity: entity): string => (<any>entity)?.["@segw.set.name"] ?? `${ABAPUtils.getABAPName(entity)}Set`;
			let associationSetName = (<any>association)?.["@segw.set.name"] ?? `${associationName}_set`;
			writer.writeLine(`assoc_set->create_association_set(`).increaseIndent();
			writer.writeLine(`iv_association_set_name = '${associationSetName}'`);
			writer.writeLine(`iv_left_entity_set_name = '${getEntitySetName(association.parent)}'`);
			writer.writeLine(`iv_right_entity_set_name = '${getEntitySetName(association._target)}'`);
			writer.writeLine(`iv_association_name = '${associationName}'`);
			writer.decreaseIndent().writeLine(').');

			writer.writeLine();

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
			writer.writeLine(`entity_type = model->get_entity_type( iv_entity_name = '${ABAPUtils.getABAPName(association.parent)}' ).`);
			writer.writeLine(`nav_property = entity_type->create_navigation_property(`).increaseIndent();
			writer.writeLine(`iv_property_name = '${propertyName}'`);
			writer.writeLine(`iv_abap_fieldname = '${abapName}'`);
			writer.writeLine(`iv_association_name = '${associationName}'`);
			writer.decreaseIndent().writeLine(`).`).writeLine();
		}
		return writer.generate();
	}
}