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

entity Property : cuid, managed {
	address: Address;
	rooms: Composition of many Room;
}

entity Room: cuid, managed {
	property: Association to one Property;
	roomNumber: String(5);
}

entity CustomerRooms: cuid, managed, temporal {
	customer: Composition of one Customer;
	room: Composition of one Room;
}

entity Customer: cuid, managed {
	name: String;
	billingAddress: Address;
}