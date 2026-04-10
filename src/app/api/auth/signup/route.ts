import connectDB from "@/lib/mongoose";
import { createPersonalPortfolio } from "@/models/Portfolio";
import { generateSessionToken, hashPassword, UserModel } from "@/models/User";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const body = await request.json();
		const { name, email, password } = body;

		if (!name || !email || !password) {
			return NextResponse.json(
				{ error: "Name, email, and password are required" },
				{ status: 400 },
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 },
			);
		}

		// Check for existing user
		const existing = await UserModel.findOne({
			$or: [{ email: email.toLowerCase() }],
		}).lean();

		if (existing) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 409 },
			);
		}

		// Derive username from email
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
		const initial = name
			.split(" ")
			.map((w: string) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
		const bgColors = [
			"1e3a5f",
			"4a1942",
			"0d7377",
			"5c3d2e",
			"8b5e3c",
			"2d6a4f",
			"6b2fa0",
			"b5651d",
		];
		const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];

		const user = await UserModel.create({
			id: userId,
			name,
			username,
			displayName: name
				.split(" ")
				.map((w: string) => w[0].toUpperCase() + w.slice(1))
				.join(" "),
			email: email.toLowerCase(),
			passwordHash: hashPassword(password),
			avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${initial}&backgroundColor=${bgColor}`,
			type: "individual",
			joinDate: new Date().toISOString().split("T")[0],
			salesCount: 0,
			followerCount: 0,
			allowBookings: false,
		});

		// Create personal portfolio for new user
		await createPersonalPortfolio(userId, user.displayName);

		// Set session cookie
		const token = generateSessionToken();
		await UserModel.updateOne(
			{ id: userId },
			{ $set: { sessionToken: token } },
		);

		// Store token → userId mapping in a simple way: embed token in cookie as `token:userId`
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
				id: user.id,
				name: user.name,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatar: user.avatar,
				type: user.type,
			},
		});
	} catch (error) {
		console.error("Signup error:", error);
		return NextResponse.json(
			{ error: "Failed to create account" },
			{ status: 500 },
		);
	}
}
