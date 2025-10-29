using { Property, Customer } from '../db/Hotel.cds';

@segw.name: 'ZHOTEL'
service Hotel {
	entity Properties as projection on Property;

	entity Customers as projection on Customer;
}