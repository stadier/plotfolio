import connectDB from "@/lib/mongoose";
import { allocateUniquePlotWords, PropertyModel } from "@/models/Property";
import { NextResponse } from "next/server";

/**
 * POST /api/properties/plotwords/backfill
 *
 * Migration: ensure every property with valid coordinates has a UNIQUE
 * PlotWords code stored on the record. Resolves two cases:
 *   1. Properties missing a code     → allocate one.
 *   2. Properties sharing a code     → keep the oldest, reallocate the rest
 *      so each property ends up with its own collision-free triplet.
 */
export async function POST() {
	try {
		await connectDB();

		// 1. De-duplicate existing codes. Group by plotWords; for any group
		// with >1 member, keep the oldest (by createdAt / _id) and clear
		// the code on the rest so the allocator can reassign them.
		const duplicates = await PropertyModel.aggregate<{
			_id: string;
			ids: string[];
		}>([
			{ $match: { plotWords: { $type: "string", $ne: "" } } },
			{
				$group: {
					_id: "$plotWords",
					ids: { $push: "$id" },
					count: { $sum: 1 },
				},
			},
			{ $match: { count: { $gt: 1 } } },
		]);

		let cleared = 0;
		for (const group of duplicates) {
			// Skip the first (oldest insertion order in MongoDB push); reset the rest.
			const toClear = group.ids.slice(1);
			if (toClear.length === 0) continue;
			const result = await PropertyModel.updateMany(
				{ id: { $in: toClear } },
				{ $unset: { plotWords: "" } },
			);
			cleared += result.modifiedCount ?? 0;
		}

		// 2. Allocate a unique code for every property still missing one.
		const missing = await PropertyModel.find({
			$or: [
				{ plotWords: { $exists: false } },
				{ plotWords: null },
				{ plotWords: "" },
			],
		})
			.select({ id: 1, coordinates: 1 })
			.lean();

		let allocated = 0;
		let skipped = 0;
		for (const prop of missing) {
			const lat = prop.coordinates?.lat;
			const lng = prop.coordinates?.lng;
			const code = await allocateUniquePlotWords(lat, lng, prop.id);
			if (!code) {
				skipped++;
				continue;
			}
			await PropertyModel.updateOne(
				{ id: prop.id },
				{ $set: { plotWords: code } },
			);
			allocated++;
		}

		return NextResponse.json({
			message: `Backfill complete. Cleared ${cleared} duplicate codes, allocated ${allocated} new codes (${skipped} skipped due to invalid coords).`,
			duplicatesResolved: cleared,
			allocated,
			skipped,
		});
	} catch (error) {
		console.error("PlotWords backfill error:", error);
		return NextResponse.json(
			{ error: "Failed to backfill plotWords" },
			{ status: 500 },
		);
	}
}
