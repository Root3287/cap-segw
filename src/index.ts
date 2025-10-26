import cds, { csn, EDM, linked } from "@sap/cds";
import ModelProviderClassGeneratorV4 from "./generator/ModelProviderClassGeneratorV4";
import ModelProviderClassGeneratorV2 from "./generator/ModelProviderClassGeneratorV2";
import DataProviderClassGeneratorV4 from "./generator/DataProviderClassGeneratorV4";
import DataProviderClassGeneratorV2 from "./generator/DataProviderClassGeneratorV2";

const LOG = cds.log("segw");

type GeneratorOptions = {
	outputDirectory: string;
};

interface OutputData {
	filename: string;
	code: string;
};

interface CompilerInfo {
	csn: linked.LinkedCSN;
	csdl: any;
	options ?: any;
};

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
	const namespace = Object.keys(compilerInfo.csdl)[3];
	const namespaceContainer = compilerInfo.csdl[namespace];
	const csnService = compilerInfo.csn.services[namespace];
	const namespaceSplit = namespace.split(".");

	let odataVersion = parseInt(compilerInfo.options?.["odata-version"] ?? "4");

	let classNames = {
		mpc: (<any>csnService)?.["@segw.class.mpc"] ?? `ZCL_${namespaceSplit[namespaceSplit.length - 1].toUpperCase()}_MPC`,
		dpc: (<any>csnService)?.["@segw.class.dpc"] ?? `ZCL_${namespaceSplit[namespaceSplit.length - 1].toUpperCase()}_DPC`,
	};

	let mpcGenerator = (odataVersion === 4) ? new ModelProviderClassGeneratorV4() : new ModelProviderClassGeneratorV2();
	let dpcGenerator = (odataVersion === 4) ? new DataProviderClassGeneratorV4() : new DataProviderClassGeneratorV2();

	mpcGenerator.setClassName(classNames.mpc);
	dpcGenerator.setClassName(classNames.dpc);

	for(let entityType of csnService.entities){
		mpcGenerator.addEntity(entityType);
	}

	return [
		{filename: `${classNames.mpc}.abap`, code: mpcGenerator.generate() },
		{filename: `${classNames.dpc}.abap`, code: dpcGenerator.generate() }
	];
}

function* _iterate(generatedClasses: OutputData[]){
	for(const abapClass of generatedClasses){
		yield [abapClass.code, { file: abapClass.filename }];
	}
}