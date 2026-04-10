import connectDB from "@/lib/mongoose";
import {
	createPersonalPortfolio,
	PortfolioMemberModel,
} from "@/models/Portfolio";
import { generateSessionToken, UserModel } from "@/models/User";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function POST(request: NextRequest) {
	try {
		if (!GOOGLE_CLIENT_ID) {
			return NextResponse.json(
				{ error: "Google sign-in is not configured" },
				{ status: 500 },
			);
		}

		const body = await request.json();
		const { credential } = body;

		if (!credential) {
			return NextResponse.json(
				{ error: "Google credential is required" },
				{ status: 400 },
			);
		}

		// Verify the Google ID token
		const client = new OAuth2Client(GOOGLE_CLIENT_ID);
		const ticket = await client.verifyIdToken({
			idToken: credential,
			audience: GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();

		if (!payload || !payload.email) {
			return NextResponse.json(
				{ error: "Invalid Google token" },
				{ status: 401 },
			);
		}

		const { email, name, picture, sub: googleId } = payload;

		await connectDB();

		// Check if user already exists by email
		let user = await UserModel.findOne({
			email: email.toLowerCase(),
		}).lean();

		if (!user) {
			// Create a new account for this Google user
			const baseUsername = email
				.split("@")[0]
				.toLowerCase()
				.replace(/[^a-z0-9_]/g, "_");
			let username = baseUsername;
			let suffix = 1;
			while (await UserModel.findOne({ username }).lean()) {
				username = `${baseUsername}_${suffix++}`;
			}

			const userId = crypto.randomUUID();
			const displayName = (name || email.split("@")[0])
				.split(" ")
				.map((w: string) => w[0].toUpperCase() + w.slice(1))
				.join(" ");

			user = await UserModel.create({
				id: userId,
				name: name || email.split("@")[0],
				username,
				displayName,
				email: email.toLowerCase(),
				// Google users don't have a local password — store a random hash
				passwordHash: `google:${googleId}`,
				avatar:
					picture ||
					`https://api.dicebear.com/9.x/initials/svg?seed=${displayName.slice(0, 2)}&backgroundColor=1e3a5f`,
				type: "individual",
				joinDate: new Date().toISOString().split("T")[0],
				salesCount: 0,
				followerCount: 0,
				allowBookings: false,
			});
		}

		// Ensure personal portfolio exists
		const userId = (user as any).id;
		const hasMembership = await PortfolioMemberModel.findOne({ userId }).lean();
		if (!hasMembership) {
			await createPersonalPortfolio(userId, (user as any).displayName);
		}

		// Set session cookie
		const token = generateSessionToken();
		await UserModel.updateOne(
			{ id: userId },
			{ $set: { sessionToken: token } },
		);

		const cookieStore = await cookies();
		cookieStore.set(SESSION_COOKIE, `${token}:${userId}`, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: SESSION_MAX_AGE,
			path: "/",
		});

		return NextResponse.json({
			user: {
				id: userId,
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
		console.error("Google auth error:", error);
		return NextResponse.json(
			{ error: "Google authentication failed" },
			{ status: 500 },
		);
	}
}
