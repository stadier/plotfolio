/**
 * PATCH /api/offers/[id] — owner accepts/counters/rejects, buyer withdraws.
 * Accepting an offer auto-creates a Sale (or links to an existing draft sale).
 */

import connectDB from "@/lib/mongoose";
import { acceptOffer } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { OfferModel } from "@/models/Sale";
import { OfferStatus } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const offer = await OfferModel.findOne({ id }).lean<any>();
		if (!offer)
			return NextResponse.json({ error: "Offer not found" }, { status: 404 });
		const { _id, __v, ...clean } = offer;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error fetching offer:", error);
		return NextResponse.json(
			{ error: "Failed to fetch offer" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		await connectDB();
		const { id } = await params;
		const { action, counterAmount, counterMessage } = await request.json();

		const offer = await OfferModel.findOne({ id });
		if (!offer)
			return NextResponse.json({ error: "Offer not found" }, { status: 404 });

		const now = new Date().toISOString();

		switch (action) {
			case "accept": {
				const result = await acceptOffer(id, user.id);
				return NextResponse.json(result);
			}
			case "counter": {
				if (offer.sellerId !== user.id)
					return NextResponse.json(
						{ error: "Only the seller can counter" },
						{ status: 403 },
					);
				if (typeof counterAmount !== "number")
					return NextResponse.json(
						{ error: "counterAmount required" },
						{ status: 400 },
					);
				offer.counterAmount = counterAmount;
				offer.counterMessage = counterMessage;
				offer.counteredAt = now;
				offer.status = OfferStatus.COUNTERED;
				break;
			}
			case "reject": {
				if (offer.sellerId !== user.id)
					return NextResponse.json(
						{ error: "Only the seller can reject" },
						{ status: 403 },
					);
				offer.status = OfferStatus.REJECTED;
				offer.rejectedAt = now;
				break;
			}
			case "withdraw": {
				if (offer.buyerId !== user.id)
					return NextResponse.json(
						{ error: "Only the buyer can withdraw" },
						{ status: 403 },
					);
				offer.status = OfferStatus.WITHDRAWN;
				offer.withdrawnAt = now;
				break;
			}
			default:
				return NextResponse.json(
					{ error: "action must be accept | counter | reject | withdraw" },
					{ status: 400 },
				);
		}

		await offer.save();
		const obj = offer.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating offer:", error);
		const msg =
			error instanceof Error ? error.message : "Failed to update offer";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
