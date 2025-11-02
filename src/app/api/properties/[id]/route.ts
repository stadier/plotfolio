import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();
		const property = await PropertyService.getPropertyById(params.id);

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
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();
		const updates = await request.json();
		const updated = await PropertyService.updateProperty(params.id, updates);

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
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();
		const deleted = await PropertyService.deleteProperty(params.id);

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
