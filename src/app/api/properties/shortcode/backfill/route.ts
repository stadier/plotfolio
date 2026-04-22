import connectDB from "@/lib/mongoose";
import { PropertyModel } from "@/models/Property";
import { NextResponse } from "next/server";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function makeCode(length = 8): string {
	let code = "";
	for (let i = 0; i < length; i++) {
		code += CHARS[Math.floor(Math.random() * CHARS.length)];
	}
	return code;
}

/**
 * POST /api/properties/shortcode/backfill
 *
 * Assigns a shortCode to every property that doesn't have one.
 */
export async function POST() {
	try {
		await connectDB();

		const missing = await PropertyModel.find({
			$or: [
				{ shortCode: { $exists: false } },
				{ shortCode: "" },
				{ shortCode: null },
			],
		}).lean();

		let updated = 0;
		let skipped = 0;

		for (const prop of missing) {
			// Generate a unique code
			let code = makeCode();
			let attempts = 0;
			while (attempts < 10) {
				const clash = await PropertyModel.findOne({ shortCode: code }).lean();
				if (!clash) break;
				code = makeCode();
				attempts++;
			}

			await PropertyModel.updateOne(
				{ _id: prop._id },
				{ $set: { shortCode: code } },
			);
			updated++;
		}

		return NextResponse.json({ updated, skipped, total: missing.length });
	} catch (error) {
		console.error("Short code backfill error:", error);
		return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
	}
}
