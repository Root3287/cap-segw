import cds, { csn, EDM, linked } from "@sap/cds";
import { CompilerInfo, OutputData } from "./types/frontend";
import IFServiceClassGenerator from "./generator/IFCodeGenerator";
import ModelProviderClassGeneratorV4 from "./generator/ModelProviderClassGeneratorV4";
import ModelProviderClassGeneratorV2 from "./generator/ModelProviderClassGeneratorV2";
import DataProviderClassGeneratorV4 from "./generator/DataProviderClassGeneratorV4";
import DataProviderClassGeneratorV2 from "./generator/DataProviderClassGeneratorV2";

const LOG = cds.log("segw");

export default (csn: csn.CSN, options: any) => {
	// Group by Service
	const csdl: EDM | string = cds.compile.to.edm(csn, Object.assign({
		odataOpenapiHints: true,
		edm4OpenAPI: true,
		to: 'openapi'
	}, options));

	// LOG.info(csdl);

	let generatedClasses: OutputData[] = [];

	if((<any>csdl)[Symbol.iterator]){
		generatedClasses.push(...compileMultiple({
			csn: <linked.LinkedCSN>(csn as unknown), 
			csdl: csdl, 
			options: options
		}));
	}else{
		generatedClasses.push(...compileSingle({ 
			csn: <linked.LinkedCSN>(csn as unknown), 
			csdl: csdl, 
			options: options
		}));
	}

	return _iterate(generatedClasses);
}

function compileMultiple(compilerInfo: CompilerInfo): OutputData[] {
	let ret: OutputData[] = [];
	for(let [content, metadata] of compilerInfo.csdl){
		if(typeof content === "string") content = JSON.parse(content);
		const singleResult = compileSingle({
			csn: compilerInfo.csn,
			csdl: content,
			options: compilerInfo.options
		});
		ret.push(...singleResult);
	}
	return ret;
};

function compileSingle(compilerInfo: CompilerInfo): OutputData[]{

	let odataVersion = parseInt(compilerInfo.options?.["odata-version"] ?? "4");

	// Go Home Typescript, you're drunk
	let generators: IFServiceClassGenerator[] = [
		(odataVersion == 2) ? new ModelProviderClassGeneratorV2() : new ModelProviderClassGeneratorV4(),
		(odataVersion == 2) ? new DataProviderClassGeneratorV2() : new DataProviderClassGeneratorV4()
	];

	generators.forEach((generator: IFServiceClassGenerator) => {
		(<any>generator).setCompilerInfo(compilerInfo)
	});

	return generators.map((generator: IFServiceClassGenerator) => {
		return { 
			filename: (<any>generator).getFileName(), 
			code: (<any>generator).generate() 
		};
	});
}

function* _iterate(generatedClasses: OutputData[]){
	for(const abapClass of generatedClasses){
		yield [abapClass.code, { file: abapClass.filename }];
	}
}