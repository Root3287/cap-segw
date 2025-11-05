using { cuid, managed, temporal, Country } from '@sap/cds/common';

type Address {
	street_1: String;
	street_2: String;
	city: String;

	@segw.abap.type: 'regio'
	region: String;
	postal: String;

	@segw.association.ignore
	country: Country not null;
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

	customer: Association to one Customer;
	room: Association to one Room;
}