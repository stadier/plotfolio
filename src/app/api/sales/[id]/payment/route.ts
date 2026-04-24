/**
 * POST /api/sales/[id]/payment
 *
 * Buyer submits payment proof or marks payment as initiated. The seller
 * (or platform admin, when payment is processed in-platform) confirms
 * receipt to advance the sale to the stamping step.
 *
 * Body:
 *   { action: "submit", method, reference?, proofUrl?, installmentIndex? }
 *   { action: "confirm", installmentIndex? }
 */

import connectDB from "@/lib/mongoose";
import { calculateFee, splitFee } from "@/lib/saleFees";
import { getSessionUser } from "@/lib/session";
import { PlatformChargeModel, SaleModel } from "@/models/Sale";
import {
	InstallmentStatus,
	PaymentMethod,
	PlatformChargeStatus,
	SaleStatus,
	SaleStep,
} from "@/types/sale";
import crypto from "crypto";
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
		const body = await request.json();
		const action = body.action ?? "submit";

		const sale = await SaleModel.findOne({ id });
		if (!sale)
			return NextResponse.json({ error: "Sale not found" }, { status: 404 });

		if (action === "submit") {
			if (sale.buyerId !== user.id) {
				return NextResponse.json(
					{ error: "Only the buyer can submit payment" },
					{ status: 403 },
				);
			}

			const { method, reference, proofUrl, installmentIndex } = body;
			if (!method || !Object.values(PaymentMethod).includes(method)) {
				return NextResponse.json(
					{ error: "Valid payment method required" },
					{ status: 400 },
				);
			}

			sale.paymentMethod = method;
			sale.paymentReference = reference;
			sale.paymentProofUrl = proofUrl;

			// Installment-aware
			if (
				typeof installmentIndex === "number" &&
				sale.installmentPlan?.schedule?.[installmentIndex]
			) {
				const item = sale.installmentPlan.schedule[installmentIndex];
				item.reference = reference;
				sale.markModified("installmentPlan");
			}

			await sale.save();
			const obj = sale.toObject();
			const { _id, __v, ...clean } = obj as any;
			return NextResponse.json(clean);
		}

		if (action === "confirm") {
			// Seller (or platform admin) confirms payment received
			if (sale.sellerId !== user.id && !user.isAdmin) {
				return NextResponse.json(
					{ error: "Only the seller or admin can confirm payment" },
					{ status: 403 },
				);
			}

			const { installmentIndex } = body;
			const now = new Date().toISOString();

			if (
				typeof installmentIndex === "number" &&
				sale.installmentPlan?.schedule?.[installmentIndex]
			) {
				const item = sale.installmentPlan.schedule[installmentIndex];
				item.status = InstallmentStatus.PAID;
				item.paidAt = now;
				sale.markModified("installmentPlan");

				const allPaid = sale.installmentPlan.schedule.every(
					(s: any) => s.status === InstallmentStatus.PAID,
				);
				if (allPaid) {
					sale.status = SaleStatus.PAYMENT_RECEIVED;
					sale.currentStep = SaleStep.STAMPING;
					sale.paymentConfirmedAt = now;
					sale.paymentConfirmedBy = user.id;
				}
			} else {
				sale.status = SaleStatus.PAYMENT_RECEIVED;
				sale.currentStep = SaleStep.STAMPING;
				sale.paymentConfirmedAt = now;
				sale.paymentConfirmedBy = user.id;
			}

			// Record platform fee charge (manual/audit only — actual collection
			// happens via gateway-specific webhooks)
			const finalAmount = sale.agreedAmount ?? sale.askingPrice;
			const totalFee = calculateFee(sale.fees, finalAmount);
			sale.fees.calculatedFeeAmount = totalFee;
			sale.markModified("fees");

			if (totalFee > 0) {
				const split = splitFee(totalFee, sale.fees);
				const payerId = split.buyer > 0 ? sale.buyerId! : sale.sellerId;
				await PlatformChargeModel.create({
					id: crypto.randomUUID(),
					saleId: sale.id,
					payerId,
					amount: totalFee,
					currency: sale.currency,
					gateway: "manual",
					status: PlatformChargeStatus.PENDING,
				});
			}

			await sale.save();
			const obj = sale.toObject();
			const { _id, __v, ...clean } = obj as any;
			return NextResponse.json(clean);
		}

		return NextResponse.json(
			{ error: "action must be 'submit' or 'confirm'" },
			{ status: 400 },
		);
	} catch (error) {
		console.error("Error in payment endpoint:", error);
		return NextResponse.json(
			{ error: "Failed to process payment action" },
			{ status: 500 },
		);
	}
}
