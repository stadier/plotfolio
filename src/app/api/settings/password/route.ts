import connectDB from "@/lib/mongoose";
import { hashPassword, UserModel, verifyPassword } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

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

		const { currentPassword, newPassword } = await req.json();

		if (!newPassword) {
			return NextResponse.json(
				{ error: "New password is required" },
				{ status: 400 },
			);
		}

		if (typeof newPassword !== "string" || newPassword.length < 8) {
			return NextResponse.json(
				{ error: "New password must be at least 8 characters" },
				{ status: 400 },
			);
		}

		if (newPassword.length > 128) {
			return NextResponse.json(
				{ error: "Password must be 128 characters or less" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const u = user as any;
		const isGoogleOnlyAccount =
			typeof u.passwordHash === "string" &&
			(u.passwordHash === "google-oauth" ||
				u.passwordHash.startsWith("google:"));

		if (!u.passwordHash) {
			return NextResponse.json(
				{
					error: "No existing password record found for this account.",
				},
				{ status: 400 },
			);
		}

		if (!isGoogleOnlyAccount && !currentPassword) {
			return NextResponse.json(
				{ error: "Current password is required" },
				{ status: 400 },
			);
		}

		if (
			!isGoogleOnlyAccount &&
			!verifyPassword(currentPassword, u.passwordHash)
		) {
			return NextResponse.json(
				{ error: "Current password is incorrect" },
				{ status: 403 },
			);
		}

		const newHash = hashPassword(newPassword);
		await UserModel.updateOne(
			{ id: userId },
			{ $set: { passwordHash: newHash } },
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Password change error:", error);
		return NextResponse.json(
			{ error: "Failed to change password" },
			{ status: 500 },
		);
	}
}
