using { Address, Location, Customer, Reservation } from '../db/Hotel.cds';

@segw.name: 'ZHOTEL'
service Hotel {
	entity Locations as projection on Location actions {
		function getPendingCustomersForDay(day: Date) returns array of Customers;
		function getPendingReservationForDay(day: Date) returns array of Reservations;
		function getReservations() returns array of Reservations;
	};

	entity Customers as projection on Customer;

	entity Reservations as projection on Reservation
	actions {
		action submit() returns Reservations;
		action checkIn() returns Reservations;
		action cancel(reason: String) returns Reservations; 
	};

	function getNearestHotel(address: Address) returns Locations;
	function getTopLocations(count: Integer) returns array of Locations;
	action process() returns Address;
}