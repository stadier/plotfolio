import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	try {
		await connectDB();
		const properties = await PropertyService.getAllProperties();
		return NextResponse.json(properties);
	} catch (error) {
		console.error("Error fetching properties:", error);
		return NextResponse.json(
			{ error: "Failed to fetch properties" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const property = await request.json();
		const created = await PropertyService.createProperty(property);
		return NextResponse.json(created, { status: 201 });
	} catch (error) {
		console.error("Error creating property:", error);
		return NextResponse.json(
			{ error: "Failed to create property" },
			{ status: 500 }
		);
	}
}
