import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

/**
 * GET /api/settings/preferences
 * Returns the current user's behaviour preferences (separate from
 * provider settings, profile, etc.).
 */
export async function GET() {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const [, userId] = session.split(":");
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	await connectDB();
	const user = await UserModel.findOne({ id: userId })
		.select("settings")
		.lean();
	const settings = (user as any)?.settings ?? {};
	return NextResponse.json({
		settings: {
			aiDocumentProcessing: !!settings.aiDocumentProcessing,
		},
	});
}

/**
 * PUT /api/settings/preferences
 * Updates the current user's behaviour preferences. Only known keys are
 * persisted — unknown fields are ignored to prevent mass assignment.
 */
export async function PUT(req: NextRequest) {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const [, userId] = session.split(":");
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json().catch(() => ({}));
	const updates: Record<string, unknown> = {};
	if (typeof body.aiDocumentProcessing === "boolean") {
		updates["settings.aiDocumentProcessing"] = body.aiDocumentProcessing;
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json(
			{ error: "No supported preference fields provided" },
			{ status: 400 },
		);
	}

	await connectDB();
	const user = await UserModel.findOneAndUpdate(
		{ id: userId },
		{ $set: updates },
		{ new: true },
	)
		.select("settings")
		.lean();

	const settings = (user as any)?.settings ?? {};
	return NextResponse.json({
		settings: {
			aiDocumentProcessing: !!settings.aiDocumentProcessing,
		},
	});
}
