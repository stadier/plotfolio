import { CacheControl } from "@/lib/httpCache";
import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import {
	createPersonalPortfolio,
	generateUniqueSlug,
	getUserPortfolios,
	PortfolioMemberModel,
	PortfolioModel,
} from "@/models/Portfolio";
import { UserModel } from "@/models/User";
import { PortfolioMemberStatus, PortfolioRole } from "@/types/property";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/portfolios — list user's portfolios */
export async function GET() {
	try {
		const sessionUser = await getSessionUser();
		if (!sessionUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const userId = sessionUser.id;

		await connectDB();

		let portfolios = await getUserPortfolios(userId);

		// If user has no portfolios yet, create a personal one
		if (portfolios.length === 0) {
			const user = await UserModel.findOne({ id: userId }).lean();
			if (user) {
				const portfolio = await createPersonalPortfolio(
					userId,
					(user as any).displayName,
				);
				return NextResponse.json(
					[{ ...portfolio, role: PortfolioRole.ADMIN, memberCount: 1 }],
					{
						headers: {
							"Cache-Control": CacheControl.privateShort,
						},
					},
				);
			}
		}

		// Attach member counts
		const counts = await PortfolioMemberModel.aggregate([
			{
				$match: {
					portfolioId: { $in: portfolios.map((p) => p.id) },
					status: PortfolioMemberStatus.ACTIVE,
				},
			},
			{ $group: { _id: "$portfolioId", count: { $sum: 1 } } },
		]);
		const countMap = new Map<string, number>(
			counts.map((c: { _id: string; count: number }) => [c._id, c.count]),
		);

		const withCounts = portfolios.map((p) => ({
			...p,
			memberCount: countMap.get(p.id) ?? 0,
		}));

		return NextResponse.json(withCounts, {
			headers: {
				"Cache-Control": CacheControl.privateShort,
			},
		});
	} catch (error) {
		console.error("Error fetching portfolios:", error);
		return NextResponse.json(
			{ error: "Failed to fetch portfolios" },
			{ status: 500 },
		);
	}
}

/** POST /api/portfolios — create a new portfolio */
export async function POST(request: NextRequest) {
	try {
		const sessionUser = await getSessionUser();
		if (!sessionUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const userId = sessionUser.id;

		await connectDB();

		const body = await request.json();
		const { name, description, avatar } = body;

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			return NextResponse.json(
				{ error: "Portfolio name is required" },
				{ status: 400 },
			);
		}

		const portfolioId = crypto.randomUUID();
		const memberId = crypto.randomUUID();
		const slug = await generateUniqueSlug(name.trim());

		const portfolio = await PortfolioModel.create({
			id: portfolioId,
			name: name.trim(),
			slug,
			description: description?.trim() || undefined,
			avatar: avatar || undefined,
			type: "business",
			createdBy: userId,
		});

		// Creator becomes admin
		await PortfolioMemberModel.create({
			id: memberId,
			portfolioId,
			userId,
			role: PortfolioRole.ADMIN,
			status: PortfolioMemberStatus.ACTIVE,
			joinedAt: new Date().toISOString(),
		});

		const obj = portfolio.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(
			{ ...clean, role: PortfolioRole.ADMIN },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating portfolio:", error);
		return NextResponse.json(
			{ error: "Failed to create portfolio" },
			{ status: 500 },
		);
	}
}
