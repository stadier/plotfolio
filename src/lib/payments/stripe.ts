import {
	BillingInterval,
	CheckoutResult,
	CreateCheckoutParams,
	PaymentGateway,
	PaymentGatewayType,
	SubscriptionStatus,
	SubscriptionTier,
	WebhookEvent,
} from "@/types/subscription";
import Stripe from "stripe";

/* ─── Price lookup ────────────────────────────────────────────── */

// Map each tier+interval to a Stripe Price ID (set in env vars)
function priceId(tier: SubscriptionTier, interval: BillingInterval): string {
	const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
	const id = process.env[key];
	if (!id) {
		throw new Error(`Missing env var ${key} for Stripe price lookup`);
	}
	return id;
}

function getStripe(): Stripe {
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
	return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

/* ─── Stripe gateway implementation ──────────────────────────── */

export const stripeGateway: PaymentGateway = {
	type: PaymentGatewayType.STRIPE,

	async createCustomer(userId: string, email: string): Promise<string> {
		const stripe = getStripe();
		const customer = await stripe.customers.create({
			email,
			metadata: { plotfolio_user_id: userId },
		});
		return customer.id;
	},

	async createCheckoutSession(
		params: CreateCheckoutParams,
	): Promise<CheckoutResult> {
		const stripe = getStripe();

		const session = await stripe.checkout.sessions.create({
			customer_email: params.email,
			mode: "subscription",
			line_items: [
				{
					price: priceId(params.tier, params.billingInterval),
					quantity: 1,
				},
			],
			metadata: {
				plotfolio_user_id: params.userId,
				tier: params.tier,
			},
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
		});

		return {
			checkoutUrl: session.url!,
			sessionId: session.id,
		};
	},

	async cancelSubscription(gatewaySubscriptionId: string): Promise<void> {
		const stripe = getStripe();
		await stripe.subscriptions.update(gatewaySubscriptionId, {
			cancel_at_period_end: true,
		});
	},

	async resumeSubscription(gatewaySubscriptionId: string): Promise<void> {
		const stripe = getStripe();
		await stripe.subscriptions.update(gatewaySubscriptionId, {
			cancel_at_period_end: false,
		});
	},

	async parseWebhook(body: string, signature: string): Promise<WebhookEvent> {
		const stripe = getStripe();
		const secret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

		const event = stripe.webhooks.constructEvent(body, signature, secret);

		switch (event.type) {
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const sub = event.data.object as Stripe.Subscription;
				return {
					type:
						event.type === "customer.subscription.created"
							? "subscription.created"
							: "subscription.updated",
					gatewayCustomerId: sub.customer as string,
					gatewaySubscriptionId: sub.id,
					tier:
						(sub.metadata.tier as SubscriptionTier) ?? SubscriptionTier.FREE,
					status: mapStripeStatus(sub.status),
					currentPeriodStart: new Date(
						sub.current_period_start * 1000,
					).toISOString(),
					currentPeriodEnd: new Date(
						sub.current_period_end * 1000,
					).toISOString(),
					cancelAtPeriodEnd: sub.cancel_at_period_end,
				};
			}
			case "customer.subscription.deleted": {
				const sub = event.data.object as Stripe.Subscription;
				return {
					type: "subscription.cancelled",
					gatewayCustomerId: sub.customer as string,
					gatewaySubscriptionId: sub.id,
					tier:
						(sub.metadata.tier as SubscriptionTier) ?? SubscriptionTier.FREE,
					status: SubscriptionStatus.CANCELLED,
				};
			}
			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Stripe.Invoice;
				return {
					type: "payment.succeeded",
					gatewayCustomerId: invoice.customer as string,
					gatewaySubscriptionId: (invoice.subscription as string) ?? "",
					tier: SubscriptionTier.FREE, // will be resolved from DB
					status: SubscriptionStatus.ACTIVE,
				};
			}
			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				return {
					type: "payment.failed",
					gatewayCustomerId: invoice.customer as string,
					gatewaySubscriptionId: (invoice.subscription as string) ?? "",
					tier: SubscriptionTier.FREE,
					status: SubscriptionStatus.PAST_DUE,
				};
			}
			default:
				throw new Error(`Unhandled Stripe event type: ${event.type}`);
		}
	},

	async getPortalUrl(
		gatewayCustomerId: string,
		returnUrl: string,
	): Promise<string> {
		const stripe = getStripe();
		const session = await stripe.billingPortal.sessions.create({
			customer: gatewayCustomerId,
			return_url: returnUrl,
		});
		return session.url;
	},
};

/* ─── helpers ─────────────────────────────────────────────────── */

function mapStripeStatus(
	status: Stripe.Subscription.Status,
): SubscriptionStatus {
	switch (status) {
		case "active":
			return SubscriptionStatus.ACTIVE;
		case "past_due":
			return SubscriptionStatus.PAST_DUE;
		case "canceled":
			return SubscriptionStatus.CANCELLED;
		case "trialing":
			return SubscriptionStatus.TRIALING;
		case "paused":
			return SubscriptionStatus.PAUSED;
		default:
			return SubscriptionStatus.CANCELLED;
	}
}
