import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { PropertyService } from "@/models/Property";
import type { Property } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

/**
 * Create multiple properties in a single round-trip. Used by the bulk
 * unit creator (developer estates) to scaffold many child units at once
 * from a template. Each item is created independently; partial failures
 * are reported but do not abort the batch.
 */
export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const sessionUser = await getSessionUser();
		if (!sessionUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const items = Array.isArray(body?.properties) ? body.properties : null;
		if (!items || items.length === 0) {
			return NextResponse.json(
				{ error: "Provide a non-empty 'properties' array" },
				{ status: 400 },
			);
		}
		if (items.length > 200) {
			return NextResponse.json(
				{ error: "Too many properties — max 200 per request" },
				{ status: 400 },
			);
		}

		const created: Property[] = [];
		const errors: { index: number; message: string }[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const item = items[i];
				if (!item.id) item.id = crypto.randomUUID();
				const c = await PropertyService.createProperty(item);
				created.push(c);
			} catch (err) {
				errors.push({
					index: i,
					message: err instanceof Error ? err.message : String(err),
				});
			}
		}

		return NextResponse.json(
			{ createdCount: created.length, created, errors },
			{ status: errors.length === 0 ? 201 : 207 },
		);
	} catch (error) {
		console.error("Error bulk creating properties:", error);
		return NextResponse.json(
			{ error: "Failed to bulk create properties" },
			{ status: 500 },
		);
	}
}
