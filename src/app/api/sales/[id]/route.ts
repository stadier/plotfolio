import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { SaleModel } from "@/models/Sale";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/sales/[id] */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const sale = await SaleModel.findOne({ id }).lean<any>();
		if (!sale) {
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });
		}
		const { _id, __v, ...clean } = sale;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error fetching sale:", error);
		return NextResponse.json(
			{ error: "Failed to fetch sale" },
			{ status: 500 },
		);
	}
}

/** PATCH /api/sales/[id] — update sale settings, witnesses, status, etc. */
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
		const body = await request.json();

		const sale = await SaleModel.findOne({ id });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		// Only seller, buyer, or admin can modify
		const isParticipant = sale.sellerId === user.id || sale.buyerId === user.id;
		if (!isParticipant && !user.isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const allowed = [
			"settings",
			"contractHtml",
			"contractType",
			"witnesses",
			"sealId",
			"auctionStartsAt",
			"auctionEndsAt",
			"reservePrice",
			"askingPrice",
			"agreedAmount",
			"currentStep",
			"status",
			"cancelReason",
		];
		for (const key of allowed) {
			if (key in body) (sale as any)[key] = body[key];
		}

		if (body.status === "cancelled") {
			sale.cancelledAt = new Date().toISOString();
		}

		await sale.save();
		const obj = sale.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating sale:", error);
		return NextResponse.json(
			{ error: "Failed to update sale" },
			{ status: 500 },
		);
	}
}

/** DELETE /api/sales/[id] — only allowed if sale is in DRAFT status */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		await connectDB();
		const { id } = await params;
		const sale = await SaleModel.findOne({ id });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		if (sale.sellerId !== user.id && !user.isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		if (sale.status !== "draft") {
			return NextResponse.json(
				{ error: "Only draft sales can be deleted" },
				{ status: 400 },
			);
		}

		await SaleModel.deleteOne({ id });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting sale:", error);
		return NextResponse.json(
			{ error: "Failed to delete sale" },
			{ status: 500 },
		);
	}
}
