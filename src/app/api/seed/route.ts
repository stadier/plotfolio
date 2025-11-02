import connectDB from "@/lib/mongoose";
import { PropertyModel, PropertyService } from "@/models/Property";
import { Property, PropertyStatus, PropertyType } from "@/types/property";
import { NextResponse } from "next/server";

// Sample properties data
const sampleProperties: Property[] = [
	{
		id: "1",
		name: "Plot A47 - Maitama District",
		address: "Plot A47, Maitama District, Abuja FCT",
		coordinates: { lat: 9.0765, lng: 7.4951 },
		area: 800,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2023-01-15"),
		purchasePrice: 45000000,
		currentValue: 52000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Prime residential plot in upscale Maitama district with Certificate of Occupancy.",
		owner: {
			id: "1",
			name: "Adebayo Johnson",
			email: "adebayo@email.com",
			type: "individual",
		},
	},
	{
		id: "2",
		name: "Plot C23 - Gwarinpa Estate",
		address: "Plot C23, Gwarinpa Estate, Abuja FCT",
		coordinates: { lat: 9.1092, lng: 7.4165 },
		area: 600,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2022-08-20"),
		purchasePrice: 18000000,
		currentValue: 22000000,
		documents: [],
		status: PropertyStatus.DEVELOPMENT,
		description:
			"Residential plot in family-friendly Gwarinpa Estate, foundation already laid.",
		owner: {
			id: "2",
			name: "Fatima Ibrahim",
			email: "fatima@email.com",
			type: "individual",
		},
	},
	{
		id: "3",
		name: "Plot B15 - Jahi District",
		address: "Plot B15, Jahi District, Abuja FCT",
		coordinates: { lat: 9.1234, lng: 7.4321 },
		area: 1000,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2021-03-10"),
		purchasePrice: 35000000,
		currentValue: 42000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Large residential plot in developing Jahi district with good road access.",
		owner: {
			id: "1",
			name: "Adebayo Johnson",
			email: "adebayo@email.com",
			type: "individual",
		},
	},
	{
		id: "4",
		name: "Plot D31 - Kubwa District",
		address: "Plot D31, Kubwa District, Abuja FCT",
		coordinates: { lat: 9.0839, lng: 7.3492 },
		area: 500,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2023-06-15"),
		purchasePrice: 12000000,
		currentValue: 15000000,
		documents: [],
		status: PropertyStatus.FOR_SALE,
		description:
			"Affordable residential plot in Kubwa with survey plan and deed.",
		owner: {
			id: "3",
			name: "Chinedu Okafor",
			email: "chinedu@email.com",
			type: "individual",
		},
	},
	{
		id: "5",
		name: "Plot E09 - Wuye District",
		address: "Plot E09, Wuye District, Abuja FCT",
		coordinates: { lat: 9.0982, lng: 7.4763 },
		area: 750,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2022-11-03"),
		purchasePrice: 28000000,
		currentValue: 33000000,
		documents: [],
		status: PropertyStatus.UNDER_CONTRACT,
		description:
			"Well-located plot in Wuye district close to shopping centers.",
		owner: {
			id: "2",
			name: "Fatima Ibrahim",
			email: "fatima@email.com",
			type: "individual",
		},
	},
	{
		id: "6",
		name: "Plot F22 - Karsana North",
		address: "Plot F22, Karsana North, Abuja FCT",
		coordinates: { lat: 9.0234, lng: 7.4123 },
		area: 900,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2021-09-18"),
		purchasePrice: 16000000,
		currentValue: 21000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Spacious plot in fast-developing Karsana North with good infrastructure.",
		owner: {
			id: "4",
			name: "Emmanuel Uzor",
			email: "emmanuel@email.com",
			type: "individual",
		},
	},
	{
		id: "7",
		name: "My Property",
		address: "8°55'54.1\"N 7°19'27.7\"E",
		coordinates: { lat: 8.9317, lng: 7.3244 },
		area: 500,
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2025-11-02"),
		purchasePrice: 0,
		currentValue: 0,
		documents: [],
		status: PropertyStatus.OWNED,
		description: "My personal property",
		owner: {
			id: "owner-1",
			name: "Property Owner",
			email: "owner@example.com",
			type: "individual",
		},
	},
];

export async function POST() {
	try {
		await connectDB();

		// Clear existing data
		await PropertyModel.deleteMany({});

		// Insert sample data
		const created = await Promise.all(
			sampleProperties.map((property) =>
				PropertyService.createProperty(property)
			)
		);

		return NextResponse.json({
			message: `Successfully seeded ${created.length} properties`,
			properties: created,
		});
	} catch (error) {
		console.error("Error seeding database:", error);
		return NextResponse.json(
			{ error: "Failed to seed database" },
			{ status: 500 }
		);
	}
}
