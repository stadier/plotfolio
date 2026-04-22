import connectDB from "@/lib/mongoose";
import { isPlotWordsCode, toPlotWords } from "@/lib/plotwords";
import { PropertyModel } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/properties/plotwords?code=calm.brook.shine
 *
 * Resolves a PlotWords code to matching properties.
 */
export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code")?.trim().toLowerCase();

	if (!code || !isPlotWordsCode(code)) {
		return NextResponse.json(
			{ error: "Invalid PlotWords code. Expected format: word.word.word" },
			{ status: 400 },
		);
	}

	try {
		await connectDB();

		// PlotWords is persisted on records, so we can do a direct indexed-style lookup.
		let matches = await PropertyModel.find({ plotWords: code }).lean();

		// Fallback: compute from coordinates to support records not yet backfilled
		// or records whose coordinates changed after backfill.
		if (matches.length === 0) {
			const allWithCoords = await PropertyModel.find({
				"coordinates.lat": { $exists: true },
				"coordinates.lng": { $exists: true },
			}).lean();

			matches = allWithCoords.filter((p) => {
				const lat = p.coordinates?.lat;
				const lng = p.coordinates?.lng;
				if (typeof lat !== "number" || typeof lng !== "number") return false;
				if (lat === 0 && lng === 0) return false;
				return toPlotWords(lat, lng) === code;
			});
		}

		const properties = matches
			.filter((p) => typeof p.id === "string" && p.id.length > 0)
			.map((p) => ({
				id: p.id,
				name: p.name,
				address: p.address,
				coordinates: p.coordinates,
				propertyType: p.propertyType,
				status: p.status,
				plotWords: code,
			}));

		return NextResponse.json({ code, properties });
	} catch (error) {
		console.error("PlotWords lookup error:", error);
		return NextResponse.json(
			{ error: "Failed to look up PlotWords code" },
			{ status: 500 },
		);
	}
}
