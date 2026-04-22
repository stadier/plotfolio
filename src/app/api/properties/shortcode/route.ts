import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/properties/shortcode?code=a1b2c3d4
 *
 * Resolves a shortCode to the matching property id.
 */
export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code")?.trim().toLowerCase();

	if (!code || code.length < 6) {
		return NextResponse.json({ error: "Invalid short code" }, { status: 400 });
	}

	try {
		await connectDB();

		const property = await PropertyModel.findOne({ shortCode: code })
			.select("_id shortCode name address coordinates propertyType status")
			.lean();

		if (!property || !("_id" in property)) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			id: String(property._id),
			shortCode: property.shortCode,
			name: property.name,
			address: property.address,
			coordinates: property.coordinates,
			propertyType: property.propertyType,
			status: property.status,
		});
	} catch (error) {
		console.error("Short code lookup error:", error);
		return NextResponse.json(
			{ error: "Failed to look up short code" },
			{ status: 500 },
		);
	}
}
