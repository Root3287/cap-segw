import cds from "@sap/cds";
import segwCompiler from "../../src";

	describe("Integration: CAP -> SEGW ABAP generation", () => {
		test("Hotel service produces MPC and DPC classes with expected names", async () => {
			const hotelCds = `
				type Address {
					street_1: String;
					street_2: String;
					city: String;
					@segw.abap.type: 'regio'
					region: String;
					postal: String;
				};

				entity Location {
					key ID: UUID;
					address: Address;
				};

				entity Customer {
					key ID: UUID;
					name: String;
					billingAddress: Address;
				};

				entity Reservation {
					key ID: UUID;
					status: String enum { DRAFT; RESERVED; IN_PROGRESS; COMPLETED; };
					customer: Association to Customer;
				};

				@segw.name: 'ZODATAV4_TEST_TIM_01'
				service Hotel {
					entity Locations as projection on Location actions {
						function getPendingCustomersForDay(day: Date) returns array of Customers;
					};
					entity Customers as projection on Customer;
					entity Reservations as projection on Reservation actions {
						action submit() returns Reservations;
					};
					function getNearestHotel(address: Address) returns Locations;
					function getTopLocations(count: Integer) returns array of Locations;
					action process() returns Address;
				};
			`;

			const csn = cds.linked(cds.parse.cdl(hotelCds));

			const outputs = Array.from(segwCompiler(csn as any, { "odata-version": "4" }));
		const files = outputs.map(([, meta]) => meta.file);

		expect(files).toEqual(
			expect.arrayContaining([
				"ZCL_ZODATAV4_TEST_TIM_01_MPC.abap",
				"ZCL_ZODATAV4_TEST_TIM_01_DPC.abap",
			])
		);
		expect(outputs).toHaveLength(2);

		const mpc = outputs.find(([, meta]) => meta.file.includes("_MPC"))?.[0];
		const dpc = outputs.find(([, meta]) => meta.file.includes("_DPC"))?.[0];

		expect(mpc).toContain("CLASS ZCL_ZODATAV4_TEST_TIM_01_MPC DEFINITION");
		expect(mpc).toContain("METHOD /iwbep/if_v4_mp_basic~define.");

		expect(dpc).toContain("CLASS ZCL_ZODATAV4_TEST_TIM_01_DPC DEFINITION");
		// DPC generator emits CRUDQ stubs; ensure interface redefinitions are present
		expect(dpc).toContain("METHOD /iwbep/if_v4_dp_basic~read_entity_list.");
		expect(dpc).toContain("METHOD execute_getNearestHotel.");
	});
});
