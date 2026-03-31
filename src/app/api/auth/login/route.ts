import connectDB from "@/lib/mongoose";
import { generateSessionToken, UserModel, verifyPassword } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const body = await request.json();
		const { email, password } = body;

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOne({
			email: email.toLowerCase(),
		}).lean();

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		if (!verifyPassword(password, (user as any).passwordHash)) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Set session cookie
		const token = generateSessionToken();
		await UserModel.updateOne(
			{ id: (user as any).id },
			{ $set: { sessionToken: token } },
		);

		const cookieStore = await cookies();
		cookieStore.set(SESSION_COOKIE, `${token}:${(user as any).id}`, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: SESSION_MAX_AGE,
			path: "/",
		});

		return NextResponse.json({
			user: {
				id: (user as any).id,
				name: (user as any).name,
				username: (user as any).username,
				displayName: (user as any).displayName,
				email: (user as any).email,
				avatar: (user as any).avatar,
				banner: (user as any).banner,
				type: (user as any).type,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json({ error: "Failed to log in" }, { status: 500 });
	}
}
