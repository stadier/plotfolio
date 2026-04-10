import connectDB from "@/lib/mongoose";
import {
	createPersonalPortfolio,
	getUserPortfolios,
	PortfolioMemberModel,
} from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
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

		// Ensure user has at least one portfolio (migration for existing users)
		const hasMembership = await PortfolioMemberModel.findOne({
			userId,
		}).lean();
		if (!hasMembership) {
			const portfolio = await createPersonalPortfolio(
				userId,
				(user as any).displayName,
			);
			// Migrate existing properties that belong to this user
			await PropertyModel.updateMany(
				{ "owner.id": userId, portfolioId: { $exists: false } },
				{ $set: { portfolioId: portfolio.id } },
			);
			await PropertyModel.updateMany(
				{ "owner.id": userId, portfolioId: null },
				{ $set: { portfolioId: portfolio.id } },
			);
		}

		// Fetch user's portfolios
		const portfolios = await getUserPortfolios(userId);

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
			portfolios,
		});
	} catch (error) {
		console.error("Auth check error:", error);
		return NextResponse.json({ user: null }, { status: 500 });
	}
}
