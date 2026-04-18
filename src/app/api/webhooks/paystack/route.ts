import connectDB from "@/lib/mongoose";
import { getPaymentGateway } from "@/lib/payments";
import { handleWebhookEvent } from "@/lib/subscription";
import { PaymentGatewayType } from "@/types/subscription";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/webhooks/paystack — Paystack webhook handler */
export async function POST(req: NextRequest) {
	try {
		const body = await req.text();
		const signature = req.headers.get("x-paystack-signature");

		if (!signature) {
			return NextResponse.json(
				{ error: "Missing x-paystack-signature header" },
				{ status: 400 },
			);
		}

		const gw = getPaymentGateway(PaymentGatewayType.PAYSTACK);
		const event = await gw.parseWebhook(body, signature);

		await connectDB();
		await handleWebhookEvent(event);

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Paystack webhook error:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 400 },
		);
	}
}
