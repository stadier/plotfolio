import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

export async function GET() {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get(SESSION_COOKIE)?.value;

		if (!session) {
			return NextResponse.json({ user: null }, { status: 401 });
		}

		const [token, userId] = session.split(":");
		if (!token || !userId) {
			return NextResponse.json({ user: null }, { status: 401 });
		}

		await connectDB();

		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ user: null }, { status: 401 });
		}

		return NextResponse.json({
			user: {
				id: (user as any).id,
				name: (user as any).name,
				username: (user as any).username,
				displayName: (user as any).displayName,
				email: (user as any).email,
				avatar: (user as any).avatar,
				banner: (user as any).banner,
				phone: (user as any).phone,
				type: (user as any).type,
				joinDate: (user as any).joinDate,
				salesCount: (user as any).salesCount,
				followerCount: (user as any).followerCount,
				allowBookings: (user as any).allowBookings,
			},
		});
	} catch (error) {
		console.error("Auth check error:", error);
		return NextResponse.json({ user: null }, { status: 500 });
	}
}
