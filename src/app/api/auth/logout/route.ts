import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

export async function POST() {
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
