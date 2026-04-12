import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

/** Allowed fields for profile update — prevents mass assignment */
const ALLOWED_FIELDS = [
	"name",
	"displayName",
	"username",
	"phone",
	"type",
] as const;

const VALID_TYPES = ["individual", "company", "trust"] as const;

export async function PUT(req: NextRequest) {
	try {
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

		const body = await req.json();

		// Sanitize and pick only allowed fields
		const updates: Record<string, string> = {};

		for (const key of ALLOWED_FIELDS) {
			if (body[key] !== undefined) {
				const val = String(body[key]).trim();
				if (key === "name" || key === "displayName") {
					if (val.length < 1 || val.length > 100) {
						return NextResponse.json(
							{ error: `${key} must be 1–100 characters` },
							{ status: 400 },
						);
					}
				}
				if (key === "username") {
					if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(val)) {
						return NextResponse.json(
							{
								error:
									"Username must be 3–30 characters (letters, numbers, _ . -)",
							},
							{ status: 400 },
						);
					}
					// Check uniqueness
					const existing = await UserModel.findOne({
						username: val,
						id: { $ne: userId },
					}).lean();
					if (existing) {
						return NextResponse.json(
							{ error: "Username already taken" },
							{ status: 409 },
						);
					}
				}
				if (key === "phone" && val) {
					if (!/^\+?[\d\s\-().]{0,20}$/.test(val)) {
						return NextResponse.json(
							{ error: "Invalid phone format" },
							{ status: 400 },
						);
					}
				}
				if (key === "type") {
					if (!VALID_TYPES.includes(val as (typeof VALID_TYPES)[number])) {
						return NextResponse.json(
							{ error: "Invalid account type" },
							{ status: 400 },
						);
					}
				}
				updates[key] = val;
			}
		}

		if (Object.keys(updates).length === 0) {
			return NextResponse.json(
				{ error: "No valid fields to update" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOneAndUpdate(
			{ id: userId },
			{ $set: updates },
			{ new: true },
		).lean();

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const u = user as any;
		return NextResponse.json({
			user: {
				id: u.id,
				name: u.name,
				username: u.username,
				displayName: u.displayName,
				email: u.email,
				avatar: u.avatar,
				banner: u.banner,
				phone: u.phone,
				type: u.type,
				joinDate: u.joinDate,
				salesCount: u.salesCount,
				followerCount: u.followerCount,
				allowBookings: u.allowBookings,
			},
		});
	} catch (error) {
		console.error("Profile update error:", error);
		return NextResponse.json(
			{ error: "Failed to update profile" },
			{ status: 500 },
		);
	}
}
