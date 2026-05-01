import connectDB from "@/lib/mongoose";
import { parseSessionCookie } from "@/lib/session";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

export async function POST() {
	// Revoke the server-side session token so stale cookies can't be reused
	const parsed = await parseSessionCookie();
	if (parsed) {
		try {
			await connectDB();
			// Only revoke this device's token — leave other active sessions intact.
			await UserModel.updateOne(
				{ id: parsed.userId },
				{ $pull: { sessionTokens: parsed.token } },
			);
		} catch {
			// Non-fatal: proceed with cookie clear even if DB update fails
		}
	}

	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 0,
		path: "/",
	});

	return NextResponse.json({ success: true });
}
