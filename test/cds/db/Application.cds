namespace Application;

using { cuid, managed, temporal } from '@sap/cds/common';


entity Application: cuid {
	name: String;
	description: String;

	@segw.association.fix
	features: Composition of many Application.Feature on features.application = $self;
};

entity Application.Feature { 
	@segw.association.fix
	key application: Association to Application;
	key code: String;
	name: String;
	description: String;

	@segw.association.fix
	settings: Composition of many Application.Feature.Setting on settings.feature = $self;
};

@segw.name: 'app_feat_settings'
entity Application.Feature.Setting {
	@segw.association.fix
	key feature: Association to Application.Feature;
	key ![key]: String;
	value: String;
};