import { CacheControl } from "@/lib/httpCache";
import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { checkPortfolioAccess } from "@/models/Portfolio";
import { PropertyService } from "@/models/Property";
import { BidModel, SaleModel } from "@/models/Sale";
import { PortfolioRole } from "@/types/property";
import { SaleStatus } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

const TERMINAL_SALE_STATUSES: string[] = [
	SaleStatus.COMPLETED,
	SaleStatus.CANCELLED,
];

export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const ownerId = searchParams.get("ownerId");
		const portfolioId = searchParams.get("portfolioId");
		const include = (searchParams.get("include") ?? "")
			.split(",")
			.map((s) => s.trim());

		// Require authentication when filtering by portfolio or owner
		if (ownerId || portfolioId) {
			const sessionUser = await getSessionUser();
			if (!sessionUser) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}
			// If portfolioId supplied, verify the caller is a member
			if (portfolioId) {
				const hasAccess = await checkPortfolioAccess(
					sessionUser.id,
					portfolioId,
					PortfolioRole.VIEWER,
				);
				if (!hasAccess) {
					return NextResponse.json({ error: "Forbidden" }, { status: 403 });
				}
			}
			// If only ownerId supplied, it must match the authenticated user
			if (ownerId && !portfolioId && ownerId !== sessionUser.id) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		let properties = await PropertyService.getAllProperties();
		if (ownerId && portfolioId) {
			// Own portfolio: match by portfolio OR by ownership (handles stale portfolioId)
			properties = properties.filter(
				(p) => p.portfolioId === portfolioId || p.owner?.id === ownerId,
			);
		} else if (portfolioId) {
			properties = properties.filter((p) => p.portfolioId === portfolioId);
		} else if (ownerId) {
			properties = properties.filter((p) => p.owner?.id === ownerId);
		}
		const filtered = status
			? (() => {
					const statuses = status.split(",");
					return properties.filter((p) => statuses.includes(p.status));
				})()
			: properties;

		if (include.includes("activeSale") && filtered.length > 0) {
			const ids = filtered.map((p) => p.id);
			const sales = await SaleModel.find({
				propertyId: { $in: ids },
				status: { $nin: TERMINAL_SALE_STATUSES },
			})
				.sort({ createdAt: -1 })
				.lean<any[]>();
			// Pick the most-recent non-terminal sale per property
			const byProperty = new Map<string, any>();
			for (const s of sales) {
				if (!byProperty.has(s.propertyId)) {
					const { _id, __v, ...rest } = s;
					byProperty.set(s.propertyId, rest);
				}
			}
			// For auction sales, attach lightweight bid stats
			const auctionSaleIds = Array.from(byProperty.values())
				.filter((s) => s.type === "auction")
				.map((s) => s.id);
			let bidStats: Record<
				string,
				{ count: number; topAmount?: number; topBidderName?: string }
			> = {};
			if (auctionSaleIds.length > 0) {
				const bids = await BidModel.find({
					saleId: { $in: auctionSaleIds },
				}).lean<any[]>();
				bidStats = bids.reduce(
					(acc, b) => {
						const cur = acc[b.saleId] ?? { count: 0 };
						cur.count += 1;
						if (cur.topAmount == null || b.amount > cur.topAmount) {
							cur.topAmount = b.amount;
							cur.topBidderName = b.bidderName;
						}
						acc[b.saleId] = cur;
						return acc;
					},
					{} as typeof bidStats,
				);
			}
			const enriched = filtered.map((p) => {
				const sale = byProperty.get(p.id);
				if (!sale) return p;
				const stats = bidStats[sale.id];
				return {
					...p,
					activeSale: stats ? { ...sale, bidStats: stats } : sale,
				};
			});
			return NextResponse.json(enriched, {
				headers: {
					"Cache-Control": CacheControl.privateShort,
				},
			});
		}

		return NextResponse.json(filtered, {
			headers: {
				"Cache-Control": CacheControl.privateShort,
			},
		});
	} catch (error) {
		console.error("Error fetching properties:", error);
		return NextResponse.json(
			{ error: "Failed to fetch properties" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const property = await request.json();
		const created = await PropertyService.createProperty(property);
		return NextResponse.json(created, { status: 201 });
	} catch (error) {
		console.error("Error creating property:", error);
		return NextResponse.json(
			{ error: "Failed to create property" },
			{ status: 500 },
		);
	}
}
