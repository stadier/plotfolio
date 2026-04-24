/**
 * Admin: list and review verification requests.
 *
 * GET /api/admin/verifications?status=pending
 * PATCH /api/admin/verifications/[id]
 */

import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { VerificationRequestModel } from "@/models/Sale";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		if (!user.isAdmin)
			return NextResponse.json({ error: "Admin only" }, { status: 403 });

		await connectDB();
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");

		const filter: Record<string, unknown> = {};
		if (status) filter.status = status;

		const requests = await VerificationRequestModel.find(filter)
			.sort({ createdAt: -1 })
			.lean();
		const cleaned = requests.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error listing verification requests:", error);
		return NextResponse.json(
			{ error: "Failed to list verification requests" },
			{ status: 500 },
		);
	}
}
