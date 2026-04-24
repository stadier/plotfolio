/**
 * POST /api/sales/[id]/stamp
 *
 * Final step — applies the seller's seal to the contract HTML, marks the
 * sale completed, and triggers the ownership transfer + history record
 * via completeSale().
 */

import connectDB from "@/lib/mongoose";
import { completeSale } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { SaleModel } from "@/models/Sale";
import { SaleStatus } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		await connectDB();
		const { id } = await params;
		const { sealId, stampedContractUrl } = await request.json();

		const sale = await SaleModel.findOne({ id });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		if (sale.sellerId !== user.id && !user.isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		if (sale.status !== SaleStatus.PAYMENT_RECEIVED) {
			return NextResponse.json(
				{ error: "Sale must be in PAYMENT_RECEIVED state to stamp" },
				{ status: 400 },
			);
		}

		if (sealId) sale.sealId = sealId;
		if (stampedContractUrl) sale.stampedContractUrl = stampedContractUrl;
		sale.stampedAt = new Date().toISOString();
		await sale.save();

		// Trigger completion: transfer + history + property update
		const completed = await completeSale(id);
		return NextResponse.json(completed);
	} catch (error) {
		console.error("Error stamping sale:", error);
		const msg = error instanceof Error ? error.message : "Failed to stamp sale";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
