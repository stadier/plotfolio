/**
 * Offers API.
 *
 * Buyer-initiated: any authenticated (and verified) user can make an offer
 * on a property. Owner sees offers on the property's offers panel and can
 * accept, counter, or reject. Accepting auto-creates a Sale.
 */

import connectDB from "@/lib/mongoose";
import { getPlatformSettings } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { PropertyModel } from "@/models/Property";
import { OfferModel } from "@/models/Sale";
import { OfferStatus, OfferType, VerificationStatus } from "@/types/sale";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/offers?propertyId=X | ?buyerId=X | ?sellerId=X */
export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const { searchParams } = new URL(request.url);
		const propertyId = searchParams.get("propertyId");
		const buyerId = searchParams.get("buyerId");
		const sellerId = searchParams.get("sellerId");
		const status = searchParams.get("status");

		const filter: Record<string, unknown> = {};
		if (propertyId) filter.propertyId = propertyId;
		if (buyerId) filter.buyerId = buyerId;
		if (sellerId) filter.sellerId = sellerId;
		if (status) filter.status = status;

		const offers = await OfferModel.find(filter).sort({ createdAt: -1 }).lean();
		const cleaned = offers.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error listing offers:", error);
		return NextResponse.json(
			{ error: "Failed to list offers" },
			{ status: 500 },
		);
	}
}

/** POST /api/offers — buyer creates an offer on a property */
export async function POST(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const body = await request.json();
		const {
			propertyId,
			amount,
			currency,
			offerType,
			paymentType,
			installmentPlan,
			message,
			expiresAt,
		} = body;

		if (!propertyId || typeof amount !== "number" || amount <= 0) {
			return NextResponse.json(
				{ error: "propertyId and positive amount are required" },
				{ status: 400 },
			);
		}

		await connectDB();
		const property = await PropertyModel.findOne({
			id: propertyId,
		}).lean<any>();
		if (!property)
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);

		// Cannot offer on your own property
		if (property.owner?.id === user.id) {
			return NextResponse.json(
				{ error: "You cannot make an offer on your own property" },
				{ status: 400 },
			);
		}

		// Verification gate
		const settings = await getPlatformSettings();
		if (
			settings.verificationRequiredForOffers &&
			user.verificationStatus !== VerificationStatus.VERIFIED
		) {
			return NextResponse.json(
				{
					error:
						"You must be a verified user to make purchase offers. Please complete verification in Settings.",
				},
				{ status: 403 },
			);
		}

		const offer = await OfferModel.create({
			id: crypto.randomUUID(),
			propertyId,
			propertyName: property.name,
			buyerId: user.id,
			buyerName: user.displayName ?? user.name,
			buyerEmail: user.email,
			buyerAvatar: user.avatar,
			sellerId: property.owner?.id,
			amount,
			currency: currency ?? property.currency ?? "USD",
			offerType: offerType ?? OfferType.PURCHASE,
			paymentType: paymentType ?? "full",
			installmentPlan,
			message,
			expiresAt,
			status: OfferStatus.PENDING,
		});

		const obj = offer.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error creating offer:", error);
		const msg =
			error instanceof Error ? error.message : "Failed to create offer";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
