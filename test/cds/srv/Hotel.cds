using { Location, Customer } from '../db/Hotel.cds';

@segw.name: 'ZHOTEL'
service Hotel {
	entity Locations as projection on Location;

	entity Customers as projection on Customer;
}