import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB();
		const { id } = await params;
		const property = await PropertyService.getPropertyById(id);

		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(property);
	} catch (error) {
		console.error("Error fetching property:", error);
		return NextResponse.json(
			{ error: "Failed to fetch property" },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB();
		const { id } = await params;
		const updates = await request.json();
		console.log("PUT /api/properties/[id] - ID:", id);
		console.log(
			"PUT /api/properties/[id] - Updates:",
			JSON.stringify(updates, null, 2)
		);
		const updated = await PropertyService.updateProperty(id, updates);

		if (!updated) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error updating property:", error);
		return NextResponse.json(
			{ error: "Failed to update property" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB();
		const { id } = await params;
		const deleted = await PropertyService.deleteProperty(id);

		if (!deleted) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ message: "Property deleted successfully" });
	} catch (error) {
		console.error("Error deleting property:", error);
		return NextResponse.json(
			{ error: "Failed to delete property" },
			{ status: 500 }
		);
	}
}
