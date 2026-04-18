import connectDB from "@/lib/mongoose";
import { getPaymentGateway } from "@/lib/payments";
import { handleWebhookEvent } from "@/lib/subscription";
import { PaymentGatewayType } from "@/types/subscription";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/webhooks/stripe — Stripe webhook handler */
export async function POST(req: NextRequest) {
	try {
		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!signature) {
			return NextResponse.json(
				{ error: "Missing stripe-signature header" },
				{ status: 400 },
			);
		}

		const gw = getPaymentGateway(PaymentGatewayType.STRIPE);
		const event = await gw.parseWebhook(body, signature);

		await connectDB();
		await handleWebhookEvent(event);

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Stripe webhook error:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 400 },
		);
	}
}
