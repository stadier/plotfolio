/* ─── Subscription Tiers & Feature Gating ─────────────────────── */

export enum SubscriptionTier {
	FREE = "free",
	PRO = "pro",
	BUSINESS = "business",
	ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
	ACTIVE = "active",
	PAST_DUE = "past_due",
	CANCELLED = "cancelled",
	TRIALING = "trialing",
	PAUSED = "paused",
}

export enum BillingInterval {
	MONTHLY = "monthly",
	YEARLY = "yearly",
}

export enum PaymentGatewayType {
	STRIPE = "stripe",
	PAYSTACK = "paystack",
}

/* ─── Feature flags controlled by subscription tier ───────────── */

export interface TierFeatures {
	documentAI: boolean;
	advancedAnalytics: boolean;
	customBranding: boolean;
	bulkOperations: boolean;
	apiAccess: boolean;
	prioritySupport: boolean;
	marketplace: boolean;
	basicMaps: boolean;
	teamManagement: boolean;
}

export interface TierLimits {
	maxPortfolios: number; // -1 = unlimited
	maxProperties: number;
	maxTeamMembers: number;
	maxDocumentsPerProperty: number;
	maxFileStorageMB: number;
}

export interface TierConfig {
	tier: SubscriptionTier;
	name: string;
	description: string;
	limits: TierLimits;
	features: TierFeatures;
	pricing: {
		monthly: number; // in cents (USD)
		yearly: number; // in cents (USD) — total for the year
	};
}

/* ─── Tier definitions ────────────────────────────────────────── */

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
	[SubscriptionTier.FREE]: {
		tier: SubscriptionTier.FREE,
		name: "Free",
		description: "Get started with basic property management",
		limits: {
			maxPortfolios: 1,
			maxProperties: 5,
			maxTeamMembers: 1,
			maxDocumentsPerProperty: 3,
			maxFileStorageMB: 100,
		},
		features: {
			documentAI: false,
			advancedAnalytics: false,
			customBranding: false,
			bulkOperations: false,
			apiAccess: false,
			prioritySupport: false,
			marketplace: true,
			basicMaps: true,
			teamManagement: false,
		},
		pricing: { monthly: 0, yearly: 0 },
	},
	[SubscriptionTier.PRO]: {
		tier: SubscriptionTier.PRO,
		name: "Pro",
		description: "For growing property portfolios",
		limits: {
			maxPortfolios: 5,
			maxProperties: 50,
			maxTeamMembers: 5,
			maxDocumentsPerProperty: 20,
			maxFileStorageMB: 2_000,
		},
		features: {
			documentAI: true,
			advancedAnalytics: true,
			customBranding: false,
			bulkOperations: true,
			apiAccess: false,
			prioritySupport: false,
			marketplace: true,
			basicMaps: true,
			teamManagement: true,
		},
		pricing: { monthly: 1_900, yearly: 19_000 }, // $19/mo or $190/yr
	},
	[SubscriptionTier.BUSINESS]: {
		tier: SubscriptionTier.BUSINESS,
		name: "Business",
		description: "For teams and agencies managing multiple portfolios",
		limits: {
			maxPortfolios: -1,
			maxProperties: -1,
			maxTeamMembers: 25,
			maxDocumentsPerProperty: -1,
			maxFileStorageMB: 10_000,
		},
		features: {
			documentAI: true,
			advancedAnalytics: true,
			customBranding: true,
			bulkOperations: true,
			apiAccess: true,
			prioritySupport: false,
			marketplace: true,
			basicMaps: true,
			teamManagement: true,
		},
		pricing: { monthly: 4_900, yearly: 49_000 }, // $49/mo or $490/yr
	},
	[SubscriptionTier.ENTERPRISE]: {
		tier: SubscriptionTier.ENTERPRISE,
		name: "Enterprise",
		description: "Custom solutions for large organizations",
		limits: {
			maxPortfolios: -1,
			maxProperties: -1,
			maxTeamMembers: -1,
			maxDocumentsPerProperty: -1,
			maxFileStorageMB: -1,
		},
		features: {
			documentAI: true,
			advancedAnalytics: true,
			customBranding: true,
			bulkOperations: true,
			apiAccess: true,
			prioritySupport: true,
			marketplace: true,
			basicMaps: true,
			teamManagement: true,
		},
		pricing: { monthly: 14_900, yearly: 149_000 }, // $149/mo or $1490/yr
	},
};

/* ─── Subscription record ─────────────────────────────────────── */

export interface Subscription {
	id: string;
	userId: string;
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	billingInterval: BillingInterval;
	gateway: PaymentGatewayType;
	gatewayCustomerId: string; // Stripe customer ID or Paystack customer code
	gatewaySubscriptionId: string; // Stripe subscription ID or Paystack subscription code
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialEnd?: string;
	createdAt: string;
	updatedAt: string;
}

/* ─── Payment gateway interface ───────────────────────────────── */

export interface CreateCheckoutParams {
	userId: string;
	email: string;
	tier: SubscriptionTier;
	billingInterval: BillingInterval;
	successUrl: string;
	cancelUrl: string;
}

export interface CheckoutResult {
	checkoutUrl: string;
	sessionId: string;
}

export interface WebhookEvent {
	type:
		| "subscription.created"
		| "subscription.updated"
		| "subscription.cancelled"
		| "payment.succeeded"
		| "payment.failed";
	gatewayCustomerId: string;
	gatewaySubscriptionId: string;
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	currentPeriodStart?: string;
	currentPeriodEnd?: string;
	cancelAtPeriodEnd?: boolean;
}

export interface PaymentGateway {
	readonly type: PaymentGatewayType;
	createCustomer(userId: string, email: string): Promise<string>; // returns gateway customer ID
	createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
	cancelSubscription(gatewaySubscriptionId: string): Promise<void>;
	resumeSubscription(gatewaySubscriptionId: string): Promise<void>;
	parseWebhook(body: string, signature: string): Promise<WebhookEvent>;
	getPortalUrl(gatewayCustomerId: string, returnUrl: string): Promise<string>;
}

/* ─── Utility: check feature access ──────────────────────────── */

export type FeatureKey = keyof TierFeatures;
export type LimitKey = keyof TierLimits;

export function tierAllowsFeature(
	tier: SubscriptionTier,
	feature: FeatureKey,
): boolean {
	return TIER_CONFIGS[tier].features[feature];
}

export function tierLimit(tier: SubscriptionTier, limit: LimitKey): number {
	return TIER_CONFIGS[tier].limits[limit];
}

export function isWithinLimit(
	tier: SubscriptionTier,
	limit: LimitKey,
	currentCount: number,
): boolean {
	const max = tierLimit(tier, limit);
	return max === -1 || currentCount < max;
}
