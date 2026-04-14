import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

async function getAuthUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId ?? null;
}

const VALID_LAYOUTS = ["centered", "left-aligned", "split"];

/* ─── GET /api/settings/letterhead — get saved letterhead ─────── */
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
			letterhead: (user as Record<string, unknown>).letterhead ?? null,
		});
	} catch (error) {
		console.error("GET letterhead error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch letterhead" },
			{ status: 500 },
		);
	}
}

/* ─── PUT /api/settings/letterhead — save/update letterhead ───── */
export async function PUT(req: NextRequest) {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const { letterhead } = body;

		if (!letterhead || typeof letterhead !== "object") {
			return NextResponse.json(
				{ error: "Letterhead config is required" },
				{ status: 400 },
			);
		}

		if (
			!letterhead.companyName ||
			typeof letterhead.companyName !== "string" ||
			letterhead.companyName.trim().length === 0
		) {
			return NextResponse.json(
				{ error: "Company or personal name is required" },
				{ status: 400 },
			);
		}

		if (letterhead.layout && !VALID_LAYOUTS.includes(letterhead.layout)) {
			return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
		}

		const sanitised = {
			companyName: String(letterhead.companyName).trim().slice(0, 200),
			tagline: letterhead.tagline
				? String(letterhead.tagline).trim().slice(0, 200)
				: undefined,
			logoUrl: letterhead.logoUrl
				? String(letterhead.logoUrl).trim()
				: undefined,
			address: letterhead.address
				? String(letterhead.address).trim().slice(0, 500)
				: undefined,
			phone: letterhead.phone
				? String(letterhead.phone).trim().slice(0, 50)
				: undefined,
			email: letterhead.email
				? String(letterhead.email).trim().slice(0, 200)
				: undefined,
			website: letterhead.website
				? String(letterhead.website).trim().slice(0, 200)
				: undefined,
			registrationNumber: letterhead.registrationNumber
				? String(letterhead.registrationNumber).trim().slice(0, 100)
				: undefined,
			accentColor: letterhead.accentColor
				? String(letterhead.accentColor).trim()
				: "#1e3a5f",
			fontFamily: letterhead.fontFamily
				? String(letterhead.fontFamily).trim()
				: undefined,
			layout: letterhead.layout || "centered",
			showDivider: letterhead.showDivider !== false,
			showFooter: letterhead.showFooter !== false,
		};

		await UserModel.updateOne(
			{ id: userId },
			{ $set: { letterhead: sanitised } },
		);

		return NextResponse.json({ letterhead: sanitised });
	} catch (error) {
		console.error("PUT letterhead error:", error);
		return NextResponse.json(
			{ error: "Failed to save letterhead" },
			{ status: 500 },
		);
	}
}

/* ─── DELETE /api/settings/letterhead — remove letterhead ─────── */
export async function DELETE() {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();
		await UserModel.updateOne({ id: userId }, { $unset: { letterhead: "" } });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("DELETE letterhead error:", error);
		return NextResponse.json(
			{ error: "Failed to delete letterhead" },
			{ status: 500 },
		);
	}
}
