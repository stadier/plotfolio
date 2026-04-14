import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { SealShape } from "@/types/seal";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const MAX_SEALS = 10;

async function getAuthUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId ?? null;
}

/* ─── GET /api/settings/seal — list all seals ─────────────────── */
export async function GET() {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();
		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			seals: (user as Record<string, unknown>).seals ?? [],
			defaultWatermark:
				(user as Record<string, unknown>).defaultWatermark ?? null,
		});
	} catch (error) {
		console.error("GET seals error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch seals" },
			{ status: 500 },
		);
	}
}

/* ─── POST /api/settings/seal — create a new seal ─────────────── */
export async function POST(req: NextRequest) {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const { name, config, imageUrl } = body;

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			return NextResponse.json(
				{ error: "Seal name is required" },
				{ status: 400 },
			);
		}

		if (!config || !Array.isArray(config.text) || config.text.length === 0) {
			return NextResponse.json(
				{ error: "Seal text is required" },
				{ status: 400 },
			);
		}

		if (config.shape && !Object.values(SealShape).includes(config.shape)) {
			return NextResponse.json(
				{ error: "Invalid seal shape" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const existingSeals =
			((user as Record<string, unknown>).seals as unknown[]) ?? [];
		if (existingSeals.length >= MAX_SEALS) {
			return NextResponse.json(
				{ error: `Maximum of ${MAX_SEALS} seals allowed` },
				{ status: 400 },
			);
		}

		const sealId = `seal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const isDefault = existingSeals.length === 0;

		const newSeal = {
			id: sealId,
			name: name.trim(),
			config: {
				text: config.text.map((t: string) => String(t).trim()),
				outerText: config.outerText?.trim() || undefined,
				shape: config.shape || SealShape.CIRCLE,
				color: config.color || "#1e3a5f",
				backgroundColor: config.backgroundColor || undefined,
				logoUrl: config.logoUrl || undefined,
				fontFamily: config.fontFamily || undefined,
				borderWidth: Number(config.borderWidth) || 3,
				size: Number(config.size) || 200,
			},
			imageUrl: imageUrl || undefined,
			isDefault,
		};

		await UserModel.updateOne({ id: userId }, { $push: { seals: newSeal } });

		return NextResponse.json({ seal: newSeal }, { status: 201 });
	} catch (error) {
		console.error("POST seal error:", error);
		return NextResponse.json(
			{ error: "Failed to create seal" },
			{ status: 500 },
		);
	}
}

/* ─── PUT /api/settings/seal — update a seal or default watermark */
export async function PUT(req: NextRequest) {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();

		// Update default watermark config
		if (body.defaultWatermark !== undefined) {
			await UserModel.updateOne(
				{ id: userId },
				{ $set: { defaultWatermark: body.defaultWatermark } },
			);
			return NextResponse.json({ success: true });
		}

		// Update a specific seal
		const { sealId, name, config, imageUrl, isDefault } = body;
		if (!sealId) {
			return NextResponse.json(
				{ error: "sealId is required" },
				{ status: 400 },
			);
		}

		const updates: Record<string, unknown> = {};
		if (name !== undefined) updates["seals.$.name"] = String(name).trim();
		if (config !== undefined) updates["seals.$.config"] = config;
		if (imageUrl !== undefined) updates["seals.$.imageUrl"] = imageUrl;

		if (isDefault) {
			// Unset all others first
			await UserModel.updateOne(
				{ id: userId },
				{ $set: { "seals.$[].isDefault": false } },
			);
			updates["seals.$.isDefault"] = true;
		}

		if (Object.keys(updates).length > 0) {
			await UserModel.updateOne(
				{ id: userId, "seals.id": sealId },
				{ $set: updates },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("PUT seal error:", error);
		return NextResponse.json(
			{ error: "Failed to update seal" },
			{ status: 500 },
		);
	}
}

/* ─── DELETE /api/settings/seal — remove a seal ───────────────── */
export async function DELETE(req: NextRequest) {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const sealId = searchParams.get("id");

		if (!sealId) {
			return NextResponse.json(
				{ error: "Seal id is required" },
				{ status: 400 },
			);
		}

		await connectDB();

		await UserModel.updateOne(
			{ id: userId },
			{ $pull: { seals: { id: sealId } } },
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("DELETE seal error:", error);
		return NextResponse.json(
			{ error: "Failed to delete seal" },
			{ status: 500 },
		);
	}
}
