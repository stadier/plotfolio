import connectDB from "@/lib/mongoose";
import { createSale } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { SaleModel } from "@/models/Sale";
import { SaleType } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/sales?propertyId=X | ?sellerId=X | ?buyerId=X */
export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const { searchParams } = new URL(request.url);
		const propertyId = searchParams.get("propertyId");
		const sellerId = searchParams.get("sellerId");
		const buyerId = searchParams.get("buyerId");
		const status = searchParams.get("status");

		const filter: Record<string, unknown> = {};
		if (propertyId) filter.propertyId = propertyId;
		if (sellerId) filter.sellerId = sellerId;
		if (buyerId) filter.buyerId = buyerId;
		if (status) filter.status = status;

		const sales = await SaleModel.find(filter).sort({ createdAt: -1 }).lean();
		const cleaned = sales.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error listing sales:", error);
		return NextResponse.json(
			{ error: "Failed to list sales" },
			{ status: 500 },
		);
	}
}

/** POST /api/sales — create a new Sale (private or auction) */
export async function POST(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const body = await request.json();
		const {
			type,
			propertyId,
			askingPrice,
			reservePrice,
			currency,
			settings,
			auctionStartsAt,
			auctionEndsAt,
		} = body;

		if (!type || !Object.values(SaleType).includes(type)) {
			return NextResponse.json(
				{ error: "Valid sale type is required" },
				{ status: 400 },
			);
		}
		if (!propertyId) {
			return NextResponse.json(
				{ error: "propertyId is required" },
				{ status: 400 },
			);
		}
		if (typeof askingPrice !== "number" || askingPrice <= 0) {
			return NextResponse.json(
				{ error: "askingPrice must be a positive number" },
				{ status: 400 },
			);
		}

		const sale = await createSale({
			type,
			propertyId,
			sellerId: user.id,
			askingPrice,
			reservePrice,
			currency,
			settings,
			auctionStartsAt,
			auctionEndsAt,
		});

		return NextResponse.json(sale, { status: 201 });
	} catch (error) {
		console.error("Error creating sale:", error);
		const msg =
			error instanceof Error ? error.message : "Failed to create sale";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
