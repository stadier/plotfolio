import { PaymentGateway, PaymentGatewayType } from "@/types/subscription";
import { paystackGateway } from "./paystack";
import { stripeGateway } from "./stripe";

const gateways: Record<PaymentGatewayType, PaymentGateway> = {
	[PaymentGatewayType.STRIPE]: stripeGateway,
	[PaymentGatewayType.PAYSTACK]: paystackGateway,
};

/**
 * Returns the active payment gateway.
 * Set PAYMENT_GATEWAY env var to "stripe" or "paystack".
 * Defaults to stripe.
 */
export function getPaymentGateway(
	override?: PaymentGatewayType,
): PaymentGateway {
	const type =
		override ??
		(process.env.PAYMENT_GATEWAY as PaymentGatewayType | undefined) ??
		PaymentGatewayType.STRIPE;

	const gw = gateways[type];
	if (!gw) {
		throw new Error(`Unknown payment gateway: ${type}`);
	}
	return gw;
}

export { paystackGateway, stripeGateway };
