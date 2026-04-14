import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

// GET /api/profile/lookup?username=xxx — lightweight user lookup by username
export async function GET(request: NextRequest) {
	try {
		await connectDB();

		const { searchParams } = new URL(request.url);
		const username = searchParams.get("username")?.replace(/^@/, "").trim();

		if (!username) {
			return NextResponse.json(
				{ error: "username query param is required" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOne({
			username: username.toLowerCase(),
		})
			.select("id name username displayName email avatar type")
			.lean();

		if (!user) {
			return NextResponse.json({ found: false });
		}

		const { _id, __v, ...clean } = user as any;
		return NextResponse.json({ found: true, user: clean });
	} catch (error) {
		console.error("Error looking up user:", error);
		return NextResponse.json(
			{ error: "Failed to look up user" },
			{ status: 500 },
		);
	}
}
