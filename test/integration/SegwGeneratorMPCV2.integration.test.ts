import cds from "@sap/cds";
import segwCompiler from "../../src";

describe("Integration: CAP -> SEGW MPC V2 generation", () => {
	test("Application service generates V2 MPC metadata", () => {
		const applicationCds = `
			@segw.name: 'ZAPP'
			service ApplicationService {
				entity Applications {
					key ID: UUID;
					name: String;
					description: String;
					features: Composition of many Features on features.application = $self;
				};
				entity Features {
					@segw.association.fix
					key application: Association to Applications;
					key code: String;
					name: String;
					description: String;
					settings: Composition of many Settings on settings.feature = $self;
				};
				@segw.name: 'app_feat_settings'
				entity Settings {
					@segw.association.fix
					key feature: Association to Features;
					key ![key]: String;
					value: String;
				};
			};
		`;

		const csn = cds.linked(cds.parse.cdl(applicationCds));

		const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "2" }));
		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"));
		const dpc = outputs.find(([, meta]) => meta.file.includes("_DPC"));

		expect(outputs).toHaveLength(2);
		expect(mpc?.[1].file).toBe("ZCL_ZAPP_MPC.abap");
		expect(dpc?.[1].file).toBe("ZCL_ZAPP_DPC.abap");

		const mpcCode = String(mpc?.[0]);

		expect(mpcCode).toContain("INHERITING FROM /iwbep/cl_mgw_push_abs_model");
		expect(mpcCode).toContain("model->set_schema_namespace( |ApplicationService| ).");
		expect(mpcCode).toContain("entity_type = me->model->create_entity_type(");
		expect(mpcCode).toContain("property->set_type_edm_guid( ).");
		expect(mpcCode).toContain("property->set_maxlength( iv_max_length = 36 ).");
		expect(mpcCode).toContain("entity_set = entity_type->create_entity_set( 'ApplicationsSet' ).");
		expect(mpcCode).toContain("iv_structure_name = 'ZCL_ZAPP_MPC=>T_Applications'");
		expect(mpcCode).toContain("iv_association_name = |Applications_Features|");
		expect(mpcCode).toContain("iv_association_set_name = 'Applications_Features_set'");
	});
});
