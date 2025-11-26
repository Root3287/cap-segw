using { Hotel.Address, Hotel.Location, Hotel.Customer, Hotel.Reservation } from '../db/Hotel.cds';

@segw.name: 'ZODATAV4_TEST_TIM_01'
service Hotel {
	entity Locations as projection on Hotel.Location actions {
		// function getAverageRating() returns Decimal;

		@segw.name: 'pend_cust_day'
		@segw.abap.name: 'pend_cust_day'
		function getPendingCustomersForDay(day: Date) returns array of Hotel.Customers;

		@segw.name: 'pend_resv_day'
		@segw.abap.name: 'pend_resv_day'
		function getPendingReservationForDay(day: Date) returns array of Hotel.Reservations;
		
		@segw.name: 'loc_resv'
		function getReservations() returns array of Hotel.Reservations;
	};

	entity Customers as projection on Hotel.Customer;

	entity Reservations as projection on Hotel.Reservation
	actions {
		action submit() returns Hotel.Reservations;
		action checkIn() returns Hotel.Reservations;
		action cancel(reason: String) returns Hotel.Reservations; 
	};

	function getNearestHotel(address: Address) returns Hotel.Locations;
	function getTopLocations(count: Integer) returns array of Hotel.Locations;
	action process() returns Hotel.Address;
}