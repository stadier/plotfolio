import { getPaymentGateway } from "@/lib/payments";
import { ISubscription, SubscriptionModel } from "@/models/Subscription";
import {
	BillingInterval,
	CheckoutResult,
	CreateCheckoutParams,
	FeatureKey,
	isWithinLimit,
	LimitKey,
	PaymentGatewayType,
	SubscriptionStatus,
	SubscriptionTier,
	TIER_CONFIGS,
	tierAllowsFeature,
	WebhookEvent,
} from "@/types/subscription";
import crypto from "crypto";

/* ─── Read helpers ────────────────────────────────────────────── */

export async function getUserSubscription(
	userId: string,
): Promise<ISubscription | null> {
	return SubscriptionModel.findOne({
		userId,
		status: {
			$in: [
				SubscriptionStatus.ACTIVE,
				SubscriptionStatus.TRIALING,
				SubscriptionStatus.PAST_DUE,
			],
		},
	}).lean<ISubscription>();
}

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
	const sub = await getUserSubscription(userId);
	return sub?.tier ?? SubscriptionTier.FREE;
}

/* ─── Feature & limit checks ─────────────────────────────────── */

export async function userHasFeature(
	userId: string,
	feature: FeatureKey,
): Promise<boolean> {
	const tier = await getUserTier(userId);
	return tierAllowsFeature(tier, feature);
}

export async function userWithinLimit(
	userId: string,
	limit: LimitKey,
	currentCount: number,
): Promise<boolean> {
	const tier = await getUserTier(userId);
	return isWithinLimit(tier, limit, currentCount);
}

/* ─── Checkout ────────────────────────────────────────────────── */

export async function createCheckout(
	params: CreateCheckoutParams & { gateway?: PaymentGatewayType },
): Promise<CheckoutResult> {
	const gw = getPaymentGateway(params.gateway);
	return gw.createCheckoutSession(params);
}

/* ─── Subscription lifecycle ──────────────────────────────────── */

export async function ensureFreeSubscription(
	userId: string,
): Promise<ISubscription> {
	const existing = await getUserSubscription(userId);
	if (existing) return existing;

	const now = new Date();
	const sub = await SubscriptionModel.create({
		id: crypto.randomUUID(),
		userId,
		tier: SubscriptionTier.FREE,
		status: SubscriptionStatus.ACTIVE,
		billingInterval: BillingInterval.MONTHLY,
		currentPeriodStart: now,
		currentPeriodEnd: new Date(now.getFullYear() + 100, 0, 1), // effectively never expires
		cancelAtPeriodEnd: false,
	});
	return sub.toObject() as ISubscription;
}

export async function cancelSubscription(userId: string): Promise<void> {
	const sub = await getUserSubscription(userId);
	if (!sub || sub.tier === SubscriptionTier.FREE) return;

	if (sub.gatewaySubscriptionId && sub.gateway) {
		const gw = getPaymentGateway(sub.gateway);
		await gw.cancelSubscription(sub.gatewaySubscriptionId);
	}

	await SubscriptionModel.updateOne(
		{ id: sub.id },
		{ cancelAtPeriodEnd: true },
	);
}

export async function resumeSubscription(userId: string): Promise<void> {
	const sub = await getUserSubscription(userId);
	if (!sub || !sub.gatewaySubscriptionId || !sub.gateway) return;

	const gw = getPaymentGateway(sub.gateway);
	await gw.resumeSubscription(sub.gatewaySubscriptionId);

	await SubscriptionModel.updateOne(
		{ id: sub.id },
		{ cancelAtPeriodEnd: false },
	);
}

/* ─── Billing portal ──────────────────────────────────────────── */

export async function getBillingPortalUrl(
	userId: string,
	returnUrl: string,
): Promise<string | null> {
	const sub = await getUserSubscription(userId);
	if (!sub?.gatewayCustomerId || !sub.gateway) return null;

	const gw = getPaymentGateway(sub.gateway);
	return gw.getPortalUrl(sub.gatewayCustomerId, returnUrl);
}

/* ─── Webhook processing ──────────────────────────────────────── */

export async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
	switch (event.type) {
		case "subscription.created": {
			// Find user by gateway customer ID, or upsert
			const existing = await SubscriptionModel.findOne({
				gatewayCustomerId: event.gatewayCustomerId,
			});

			if (existing) {
				await SubscriptionModel.updateOne(
					{ id: existing.id },
					{
						tier: event.tier,
						status: event.status,
						gatewaySubscriptionId: event.gatewaySubscriptionId,
						currentPeriodStart: event.currentPeriodStart,
						currentPeriodEnd: event.currentPeriodEnd,
						cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
					},
				);
			}
			break;
		}

		case "subscription.updated": {
			await SubscriptionModel.updateOne(
				{ gatewaySubscriptionId: event.gatewaySubscriptionId },
				{
					tier: event.tier,
					status: event.status,
					currentPeriodStart: event.currentPeriodStart,
					currentPeriodEnd: event.currentPeriodEnd,
					cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
				},
			);
			break;
		}

		case "subscription.cancelled": {
			await SubscriptionModel.updateOne(
				{ gatewaySubscriptionId: event.gatewaySubscriptionId },
				{ status: SubscriptionStatus.CANCELLED },
			);
			break;
		}

		case "payment.succeeded": {
			await SubscriptionModel.updateOne(
				{ gatewaySubscriptionId: event.gatewaySubscriptionId },
				{ status: SubscriptionStatus.ACTIVE },
			);
			break;
		}

		case "payment.failed": {
			await SubscriptionModel.updateOne(
				{ gatewaySubscriptionId: event.gatewaySubscriptionId },
				{ status: SubscriptionStatus.PAST_DUE },
			);
			break;
		}
	}
}

/* ─── Tier config access ──────────────────────────────────────── */

export function getTierConfig(tier: SubscriptionTier) {
	return TIER_CONFIGS[tier];
}

export function getAllTierConfigs() {
	return Object.values(TIER_CONFIGS);
}
