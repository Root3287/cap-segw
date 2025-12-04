import cds from "@sap/cds";
import CDSTypeConverter from "../src/converters/CDSV4TypeConverter";
import * as ABAP from "../src/types/abap";

const findStructure = (
	types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>,
	name: string
): ABAP.Structure | undefined =>
	types.find((t: any) => t && "name" in t && t.name === name) as ABAP.Structure | undefined;

const findTableType = (
	types: Array<ABAP.Structure | ABAP.Parameter | ABAP.Table>,
	tableName: string
): ABAP.Table | undefined =>
	types.find((t: any) => t && "structure" in t && t.structure?.name === tableName) as ABAP.Table | undefined;

const findParam = (s: ABAP.Structure | undefined, pname: string) =>
	s?.parameters?.find(p => p.name === pname);

describe("Integration: ABAP type generation from CDS", () => {
	test("Hotel service entities and complex types emit expected ABAP structures", async () => {
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
				createdAt: Timestamp;
				createdBy: String;
				modifiedAt: Timestamp;
				modifiedBy: String;
				address: Address;
			};

			entity Customer {
				key ID: UUID;
				name: String;
				billingAddress: Address;
			};

			entity Reservation {
				key ID: UUID;
				createdAt: Timestamp;
				createdBy: String;
				modifiedAt: Timestamp;
				modifiedBy: String;
				@readonly
				status: String enum {
					DRAFT;
					RESERVED;
					IN_PROGRESS;
					COMPLETED;
				};
				customer: Association to Customer;
			};

			@segw.name: 'ZODATAV4_TEST_TIM_01'
			service Hotel {
				entity Locations as projection on Location actions {
					function getPendingCustomersForDay(day: Date) returns array of Customers;
					function getReservations() returns array of Reservations;
				};
				entity Customers as projection on Customer;
				entity Reservations as projection on Reservation actions {
					action submit() returns Reservations;
					action cancel(reason: String) returns Reservations;
				};
				function getNearestHotel(address: Address) returns Locations;
				function getTopLocations(count: Integer) returns array of Locations;
				action process() returns Address;
			};
		`;

		const csn = cds.parse.cdl(hotelCds);
		const csdl = cds.compile.to.edm(csn, { odataOpenapiHints: true, edm4OpenAPI: true, to: "openapi" });
		const linked = cds.linked(csn);
		const service = linked.services.find((s: any) => s.name === "Hotel");

		// Converter expects iterable arrays; convert entity/action maps accordingly
		const converter = new CDSTypeConverter();
		converter.setCSDL(csdl);
		converter.setService({
			...service,
			entities: Object.values(service?.entities ?? {}),
			actions: Object.values(service?.actions ?? {}),
		});

		const types = converter.getABAPTypes();

		// Entity structures exist
		const loc = findStructure(types, "t_Locations");
		const cust = findStructure(types, "t_Customers");
		const resv = findStructure(types, "t_Reservations");
		expect(loc && cust && resv).toBeTruthy();

		// Key and flattened complex fields are mapped
		expect(findParam(loc, "ID")?.type).toBe(ABAP.Primitive.UUID);
		expect(findParam(loc, "address_region")?.type).toBe("regio");

		// Complex type carries annotation override (non-flattened helper type still exists)
		const addr = findStructure(types, "t_Address");
		expect(addr).toBeDefined();
		expect(findParam(addr, "region")?.type).toBe("regio");

		// Table types are emitted for entities
		const locTable = findTableType(types, "tt_Locations");
		expect(locTable?.structure?.type).toBe("t_Locations");

		// Reservation status enum collapses to string
		expect(findParam(resv, "status")?.type).toBe(ABAP.Primitive.STRING);
	});
});
