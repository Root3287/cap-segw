using { cuid, managed, temporal, Country } from '@sap/cds/common';

type Address {
	street_1: String;
	street_2: String;
	city: String;

	@segw.abap.type: 'regio'
	region: String;
	postal: String;
	country: Country;
}

entity Location : cuid, managed {
	address: Address;
	@segw.association.name: 'LocationRoom'
	rooms: Composition of many Room on rooms.location = $self;
}

entity Room: cuid, managed {
	@segw.association.ignore: true
	location: Association to Location;
	roomNumber: String(5);
}

entity Customer: cuid, managed {
	name: String;
	billingAddress: Address;
}