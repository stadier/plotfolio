/**
 * GET / POST /api/admin/platform-settings — admin-only
 */

import connectDB from "@/lib/mongoose";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/saleFees";
import { getSessionUser } from "@/lib/session";
import { PlatformSettingsModel } from "@/models/Sale";
import { PlatformSettings } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		if (!user.isAdmin)
			return NextResponse.json({ error: "Admin only" }, { status: 403 });

		await connectDB();
		const existing = await PlatformSettingsModel.findOne({
			id: "platform",
		}).lean<any>();
		if (existing) {
			const { _id, __v, ...clean } = existing;
			return NextResponse.json(clean);
		}
		return NextResponse.json({ id: "platform", ...DEFAULT_PLATFORM_SETTINGS });
	} catch (error) {
		console.error("Error fetching platform settings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch platform settings" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		if (!user.isAdmin)
			return NextResponse.json({ error: "Admin only" }, { status: 403 });

		const body = (await request.json()) as Partial<PlatformSettings>;

		await connectDB();
		const updated = await PlatformSettingsModel.findOneAndUpdate(
			{ id: "platform" },
			{
				$set: {
					...body,
					id: "platform",
					updatedBy: user.id,
				},
			},
			{ new: true, upsert: true },
		).lean<any>();

		const { _id, __v, ...clean } = updated;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating platform settings:", error);
		return NextResponse.json(
			{ error: "Failed to update platform settings" },
			{ status: 500 },
		);
	}
}
