import connectDB from "@/lib/mongoose";
import { toPlotWords } from "@/lib/plotwords";
import { PropertyModel } from "@/models/Property";
import { NextResponse } from "next/server";

/**
 * POST /api/properties/plotwords/backfill
 *
 * One-time migration: compute and store plotWords for all properties
 * that have coordinates but no plotWords value.
 */
export async function POST() {
	try {
		await connectDB();

		const properties = await PropertyModel.find({
			$or: [
				{ plotWords: { $exists: false } },
				{ plotWords: null },
				{ plotWords: "" },
			],
		}).lean();

		let updated = 0;

		for (const prop of properties) {
			const lat = prop.coordinates?.lat;
			const lng = prop.coordinates?.lng;
			if (lat == null || lng == null || (lat === 0 && lng === 0)) continue;

			const code = toPlotWords(lat, lng);
			await PropertyModel.updateOne(
				{ _id: prop._id },
				{ $set: { plotWords: code } },
			);
			updated++;
		}

		return NextResponse.json({
			message: `Backfilled plotWords for ${updated} properties`,
			total: properties.length,
			updated,
		});
	} catch (error) {
		console.error("PlotWords backfill error:", error);
		return NextResponse.json(
			{ error: "Failed to backfill plotWords" },
			{ status: 500 },
		);
	}
}
