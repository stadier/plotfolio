/** POST /api/sales/[id]/sign — record a party (or witness) signature */

import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { SaleModel } from "@/models/Sale";
import { SaleStatus, SaleStep } from "@/types/sale";
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
		const { signature, role, witnessIndex } = await request.json();

		if (!signature || typeof signature !== "string") {
			return NextResponse.json(
				{ error: "signature (data URL) is required" },
				{ status: 400 },
			);
		}

		const sale = await SaleModel.findOne({ id });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		const now = new Date().toISOString();

		if (role === "seller") {
			if (sale.sellerId !== user.id)
				return NextResponse.json(
					{ error: "Only the seller can sign here" },
					{ status: 403 },
				);
			sale.sellerSignature = {
				userId: user.id,
				name: user.displayName ?? user.name,
				signature,
				signedAt: now,
			};
		} else if (role === "buyer") {
			if (sale.buyerId !== user.id)
				return NextResponse.json(
					{ error: "Only the buyer can sign here" },
					{ status: 403 },
				);
			sale.buyerSignature = {
				userId: user.id,
				name: user.displayName ?? user.name,
				signature,
				signedAt: now,
			};
		} else if (role === "witness") {
			if (typeof witnessIndex !== "number")
				return NextResponse.json(
					{ error: "witnessIndex required for witness sign" },
					{ status: 400 },
				);
			const w = sale.witnesses?.[witnessIndex];
			if (!w)
				return NextResponse.json(
					{ error: "Witness not found at index" },
					{ status: 400 },
				);
			w.signature = signature;
			w.signedAt = now;
			sale.markModified("witnesses");
		} else {
			return NextResponse.json(
				{ error: "role must be 'seller', 'buyer', or 'witness'" },
				{ status: 400 },
			);
		}

		// Auto-advance status based on who has signed
		if (sale.sellerSignature && sale.buyerSignature) {
			if (
				sale.status === SaleStatus.UNDER_CONTRACT ||
				sale.status === SaleStatus.SIGNING ||
				sale.status === SaleStatus.UNDER_OFFER
			) {
				sale.status = SaleStatus.AWAITING_PAYMENT;
				sale.currentStep = SaleStep.PAYMENT;
			}
		} else if (sale.sellerSignature || sale.buyerSignature) {
			if (
				sale.status === SaleStatus.UNDER_OFFER ||
				sale.status === SaleStatus.UNDER_CONTRACT
			) {
				sale.status = SaleStatus.SIGNING;
				sale.currentStep = SaleStep.SIGNING;
			}
		}

		await sale.save();
		const obj = sale.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error recording signature:", error);
		return NextResponse.json(
			{ error: "Failed to record signature" },
			{ status: 500 },
		);
	}
}
