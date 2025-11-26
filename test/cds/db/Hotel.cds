namespace Hotel;

using { cuid, managed, temporal, sap.common.Countries as SAPCountry } from '@sap/cds/common';

entity Countries : SAPCountry {
	key code: String(3) not null;
}

type Country : Association to Countries;

type Address {
	street_1: String;
	street_2: String;
	city: String;

	@segw.abap.type: 'regio'
	region: String;
	postal: String;

	// country_code: String(3) not null;
	@segw.association.fix
	country: Country;
}

entity Location : cuid, managed {
	address: Address;
	@segw.association.name: 'LocationRoom'
	rooms: Composition of many Room on rooms.location = $self;
}

entity Room: cuid, managed {
	@segw.association.fix
	location: Association to Location;
	roomNumber: String(5);

	roomState: String enum {
		READY;
		DIRTY;
		CLEAN;
	}
}

entity Customer: cuid, managed {
	name: String;
	billingAddress: Address;
}

entity Reservation: cuid, temporal, managed {
	
	@readonly
	status: String enum {
		DRAFT;
		RESERVED;
		IN_PROGRESS;
		COMPLETED;
	};

	@segw.association.fix
	customer: Association to one Customer;
	
	@segw.association.fix
	room: Association to one Room;
}