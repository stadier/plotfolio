import connectDB from "@/lib/mongoose";
import { isPlotWordsCode } from "@/lib/plotwords";
import { PropertyModel } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/properties/plotwords?code=calm.brook.shine
 *
 * Resolves a PlotWords code to its matching property. Codes are unique
 * per property (allocated at create-time / via the backfill route), so
 * this endpoint returns at most one result.
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

		const matches = await PropertyModel.find({ plotWords: code }).lean();

		const properties = matches
			.filter((p) => typeof p.id === "string" && p.id.length > 0)
			.map((p) => ({
				id: p.id,
				name: p.name,
				address: p.address,
				coordinates: p.coordinates,
				propertyType: p.propertyType,
				status: p.status,
				shortCode: p.shortCode,
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
