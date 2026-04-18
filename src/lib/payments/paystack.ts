import {
	BillingInterval,
	CheckoutResult,
	CreateCheckoutParams,
	PaymentGateway,
	PaymentGatewayType,
	SubscriptionStatus,
	SubscriptionTier,
	TIER_CONFIGS,
	WebhookEvent,
} from "@/types/subscription";
import crypto from "crypto";

/* ─── Paystack plan lookup ────────────────────────────────────── */

function planCode(tier: SubscriptionTier, interval: BillingInterval): string {
	const key = `PAYSTACK_PLAN_${tier.toUpperCase()}_${interval.toUpperCase()}`;
	const code = process.env[key];
	if (!code) {
		throw new Error(`Missing env var ${key} for Paystack plan lookup`);
	}
	return code;
}

function getSecretKey(): string {
	const key = process.env.PAYSTACK_SECRET_KEY;
	if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
	return key;
}

async function paystackFetch(
	path: string,
	options: RequestInit = {},
): Promise<Record<string, unknown>> {
	const res = await fetch(`https://api.paystack.co${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Paystack API error ${res.status}: ${text}`);
	}
	return res.json() as Promise<Record<string, unknown>>;
}

/* ─── Paystack gateway implementation ─────────────────────────── */

export const paystackGateway: PaymentGateway = {
	type: PaymentGatewayType.PAYSTACK,

	async createCustomer(userId: string, email: string): Promise<string> {
		const data = await paystackFetch("/customer", {
			method: "POST",
			body: JSON.stringify({
				email,
				metadata: { plotfolio_user_id: userId },
			}),
		});
		const customer = data.data as { customer_code: string };
		return customer.customer_code;
	},

	async createCheckoutSession(
		params: CreateCheckoutParams,
	): Promise<CheckoutResult> {
		const config = TIER_CONFIGS[params.tier];
		const amount =
			params.billingInterval === BillingInterval.MONTHLY
				? config.pricing.monthly
				: config.pricing.yearly;

		const data = await paystackFetch("/transaction/initialize", {
			method: "POST",
			body: JSON.stringify({
				email: params.email,
				amount, // Paystack expects amount in lowest currency unit
				plan: planCode(params.tier, params.billingInterval),
				callback_url: params.successUrl,
				metadata: {
					plotfolio_user_id: params.userId,
					tier: params.tier,
					billing_interval: params.billingInterval,
					cancel_url: params.cancelUrl,
				},
			}),
		});

		const txn = data.data as {
			authorization_url: string;
			reference: string;
		};
		return {
			checkoutUrl: txn.authorization_url,
			sessionId: txn.reference,
		};
	},

	async cancelSubscription(gatewaySubscriptionId: string): Promise<void> {
		await paystackFetch("/subscription/disable", {
			method: "POST",
			body: JSON.stringify({
				code: gatewaySubscriptionId,
				token: gatewaySubscriptionId, // Paystack email token; real impl would store this
			}),
		});
	},

	async resumeSubscription(gatewaySubscriptionId: string): Promise<void> {
		await paystackFetch("/subscription/enable", {
			method: "POST",
			body: JSON.stringify({
				code: gatewaySubscriptionId,
				token: gatewaySubscriptionId,
			}),
		});
	},

	async parseWebhook(body: string, signature: string): Promise<WebhookEvent> {
		// Verify HMAC signature
		const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
		if (!secret) throw new Error("PAYSTACK_WEBHOOK_SECRET is not set");

		const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

		if (hash !== signature) {
			throw new Error("Invalid Paystack webhook signature");
		}

		const payload = JSON.parse(body) as {
			event: string;
			data: Record<string, unknown>;
		};

		switch (payload.event) {
			case "subscription.create": {
				const sub = payload.data as {
					customer: { customer_code: string };
					subscription_code: string;
					plan: { plan_code: string };
					next_payment_date: string;
					status: string;
				};
				const meta = (payload.data.metadata ?? {}) as { tier?: string };
				return {
					type: "subscription.created",
					gatewayCustomerId: sub.customer.customer_code,
					gatewaySubscriptionId: sub.subscription_code,
					tier: (meta.tier as SubscriptionTier) ?? SubscriptionTier.FREE,
					status: mapPaystackStatus(sub.status),
					currentPeriodEnd: sub.next_payment_date,
				};
			}
			case "subscription.not_renew":
			case "subscription.disable": {
				const sub = payload.data as {
					customer: { customer_code: string };
					subscription_code: string;
				};
				return {
					type: "subscription.cancelled",
					gatewayCustomerId: sub.customer.customer_code,
					gatewaySubscriptionId: sub.subscription_code,
					tier: SubscriptionTier.FREE,
					status: SubscriptionStatus.CANCELLED,
				};
			}
			case "charge.success": {
				const charge = payload.data as {
					customer: { customer_code: string };
					plan?: { plan_code: string };
					reference: string;
				};
				return {
					type: "payment.succeeded",
					gatewayCustomerId: charge.customer.customer_code,
					gatewaySubscriptionId: charge.plan?.plan_code ?? "",
					tier: SubscriptionTier.FREE, // resolved from DB
					status: SubscriptionStatus.ACTIVE,
				};
			}
			case "invoice.payment_failed": {
				const inv = payload.data as {
					customer: { customer_code: string };
					subscription: { subscription_code: string };
				};
				return {
					type: "payment.failed",
					gatewayCustomerId: inv.customer.customer_code,
					gatewaySubscriptionId: inv.subscription.subscription_code,
					tier: SubscriptionTier.FREE,
					status: SubscriptionStatus.PAST_DUE,
				};
			}
			default:
				throw new Error(`Unhandled Paystack event: ${payload.event}`);
		}
	},

	async getPortalUrl(
		_gatewayCustomerId: string,
		returnUrl: string,
	): Promise<string> {
		// Paystack doesn't have a billing portal like Stripe.
		// Redirect to the app's own billing management page.
		return `${returnUrl}?manage=true`;
	},
};

/* ─── helpers ─────────────────────────────────────────────────── */

function mapPaystackStatus(status: string): SubscriptionStatus {
	switch (status) {
		case "active":
			return SubscriptionStatus.ACTIVE;
		case "non-renewing":
			return SubscriptionStatus.CANCELLED;
		case "attention":
			return SubscriptionStatus.PAST_DUE;
		default:
			return SubscriptionStatus.CANCELLED;
	}
}
