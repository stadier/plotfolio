/**
 * Bids API for auctions.
 *
 * GET /api/bids?saleId=X — list bids on an auction
 * POST /api/bids — place a bid (verified bidder, amount > current highest + minIncrement)
 */

import connectDB from "@/lib/mongoose";
import { getPlatformSettings } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { BidModel, SaleModel } from "@/models/Sale";
import {
	BidStatus,
	SaleStatus,
	SaleType,
	VerificationStatus,
} from "@/types/sale";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const { searchParams } = new URL(request.url);
		const saleId = searchParams.get("saleId");
		const propertyId = searchParams.get("propertyId");
		const bidderId = searchParams.get("bidderId");

		const filter: Record<string, unknown> = {};
		if (saleId) filter.saleId = saleId;
		if (propertyId) filter.propertyId = propertyId;
		if (bidderId) filter.bidderId = bidderId;

		const bids = await BidModel.find(filter)
			.sort({ amount: -1, createdAt: -1 })
			.lean();
		const cleaned = bids.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error listing bids:", error);
		return NextResponse.json({ error: "Failed to list bids" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { saleId, amount } = await request.json();
		if (!saleId || typeof amount !== "number" || amount <= 0) {
			return NextResponse.json(
				{ error: "saleId and positive amount are required" },
				{ status: 400 },
			);
		}

		await connectDB();
		const sale = await SaleModel.findOne({ id: saleId });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		if (sale.type !== SaleType.AUCTION)
			return NextResponse.json(
				{ error: "This sale is not an auction" },
				{ status: 400 },
			);
		if (sale.status !== SaleStatus.ACTIVE)
			return NextResponse.json(
				{ error: "Auction is not active" },
				{ status: 400 },
			);
		if (sale.sellerId === user.id)
			return NextResponse.json(
				{ error: "You cannot bid on your own auction" },
				{ status: 400 },
			);

		// Auction window
		const now = new Date();
		if (sale.auctionEndsAt && new Date(sale.auctionEndsAt) < now) {
			return NextResponse.json({ error: "Auction has ended" }, { status: 400 });
		}
		if (sale.auctionStartsAt && new Date(sale.auctionStartsAt) > now) {
			return NextResponse.json(
				{ error: "Auction has not started yet" },
				{ status: 400 },
			);
		}

		// Verification gate
		const settings = await getPlatformSettings();
		if (
			(sale.settings?.requireVerifiedBuyer ??
				settings.verificationRequiredForBidding) &&
			user.verificationStatus !== VerificationStatus.VERIFIED
		) {
			return NextResponse.json(
				{
					error:
						"You must be a verified user to bid. Complete verification in Settings.",
				},
				{ status: 403 },
			);
		}

		// Determine current highest bid + min increment check
		const highest = await BidModel.findOne({
			saleId,
			status: BidStatus.ACTIVE,
		})
			.sort({ amount: -1 })
			.lean<any>();

		const increment = sale.settings?.minBidIncrement ?? 0;
		const minRequired = highest ? highest.amount + increment : sale.askingPrice;

		if (amount < minRequired) {
			return NextResponse.json(
				{
					error: `Bid must be at least ${minRequired} ${sale.currency}`,
					minRequired,
				},
				{ status: 400 },
			);
		}

		// Outbid the previous highest (if any)
		if (highest) {
			await BidModel.updateOne(
				{ id: highest.id },
				{ $set: { status: BidStatus.OUTBID } },
			);
		}

		const bid = await BidModel.create({
			id: crypto.randomUUID(),
			saleId,
			propertyId: sale.propertyId,
			bidderId: user.id,
			bidderName: user.displayName ?? user.name,
			bidderAvatar: user.avatar,
			amount,
			currency: sale.currency,
			status: BidStatus.ACTIVE,
		});

		// Anti-sniping: extend auction if bid lands in final N minutes
		const antiSnipe = sale.settings?.antiSnipingMinutes;
		if (antiSnipe && sale.auctionEndsAt) {
			const endsAt = new Date(sale.auctionEndsAt);
			const minsLeft = (endsAt.getTime() - now.getTime()) / 60000;
			if (minsLeft < antiSnipe) {
				const extended = new Date(now.getTime() + antiSnipe * 60000);
				sale.auctionEndsAt = extended.toISOString();
				await sale.save();
			}
		}

		const obj = bid.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error placing bid:", error);
		const msg = error instanceof Error ? error.message : "Failed to place bid";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
