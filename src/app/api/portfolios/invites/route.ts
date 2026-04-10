import connectDB from "@/lib/mongoose";
import { PortfolioMemberModel, PortfolioModel } from "@/models/Portfolio";
import { PortfolioMemberStatus } from "@/types/property";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

/** GET /api/portfolios/invites — list pending invites for the current user */
export async function GET() {
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

		const pending = await PortfolioMemberModel.find({
			userId,
			status: PortfolioMemberStatus.PENDING,
		}).lean();

		if (pending.length === 0) return NextResponse.json([]);

		// Enrich with portfolio info
		const portfolioIds = pending.map((m: any) => m.portfolioId);
		const portfolios = await PortfolioModel.find({
			id: { $in: portfolioIds },
		}).lean();
		const portfolioMap = new Map(portfolios.map((p: any) => [p.id, p]));

		const invites = pending.map((m: any) => {
			const p = portfolioMap.get(m.portfolioId);
			const { _id, __v, ...clean } = m;
			return {
				...clean,
				portfolio: p
					? { id: p.id, name: p.name, slug: p.slug, avatar: p.avatar }
					: null,
			};
		});

		return NextResponse.json(invites);
	} catch (error) {
		console.error("Error fetching invites:", error);
		return NextResponse.json(
			{ error: "Failed to fetch invites" },
			{ status: 500 },
		);
	}
}
