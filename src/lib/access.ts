import { getUserTier } from "@/lib/subscription";
import { resolvePermissions } from "@/models/Portfolio";
import { PortfolioPermissions, PortfolioRole } from "@/types/property";
import {
	FeatureKey,
	isWithinLimit,
	LimitKey,
	SubscriptionTier,
	tierAllowsFeature,
} from "@/types/subscription";

/**
 * Two-layer access control:
 *   Layer 1 — Subscription tier sets the ceiling (what's available)
 *   Layer 2 — Role permissions set individual access (what the user can do)
 *
 * Result: canDo(action) = subscription.allows(feature) && role.permits(action)
 */

/* ─── Feature-to-permission mapping ──────────────────────────── */

/**
 * Maps subscription features to the role permissions they gate.
 * If a feature is disabled by the subscription, the corresponding
 * role permissions are forced to false — regardless of the user's role.
 */
const FEATURE_PERMISSION_MAP: Partial<
	Record<FeatureKey, (keyof PortfolioPermissions)[]>
> = {
	// Team management gates invite capability
	teamManagement: ["canInviteMembers"],
};

/**
 * Permissions that require a paid subscription (Pro+).
 * On Free tier these are always false, even for Admins.
 */
const PAID_ONLY_PERMISSIONS: (keyof PortfolioPermissions)[] = [
	"canTransferProperties",
];

/* ─── Combined access resolution ─────────────────────────────── */

export interface AccessContext {
	tier: SubscriptionTier;
	role: PortfolioRole;
	permissionOverrides?: Partial<PortfolioPermissions> | null;
}

/**
 * Resolves effective permissions by combining subscription tier
 * limits with role-based permissions.
 */
export function resolveAccess(ctx: AccessContext): PortfolioPermissions {
	const rolePerms = resolvePermissions(ctx.role, ctx.permissionOverrides);

	// Apply subscription-level gates
	for (const [feature, perms] of Object.entries(FEATURE_PERMISSION_MAP)) {
		if (!tierAllowsFeature(ctx.tier, feature as FeatureKey)) {
			for (const perm of perms!) {
				rolePerms[perm] = false;
			}
		}
	}

	// Free-tier: disable paid-only permissions
	if (ctx.tier === SubscriptionTier.FREE) {
		for (const perm of PAID_ONLY_PERMISSIONS) {
			rolePerms[perm] = false;
		}
	}

	return rolePerms;
}

/**
 * Full access check for a specific action:
 * 1. Is the feature enabled by the user's subscription?
 * 2. Does the user's role allow this specific permission?
 */
export async function checkAccess(
	userId: string,
	role: PortfolioRole,
	permission: keyof PortfolioPermissions,
	permissionOverrides?: Partial<PortfolioPermissions> | null,
): Promise<boolean> {
	const tier = await getUserTier(userId);
	const perms = resolveAccess({ tier, role, permissionOverrides });
	return perms[permission];
}

/**
 * Check if a subscription-gated feature is available to the user,
 * independent of role permissions. Use for UI feature flags.
 */
export async function checkFeatureAccess(
	userId: string,
	feature: FeatureKey,
): Promise<boolean> {
	const tier = await getUserTier(userId);
	return tierAllowsFeature(tier, feature);
}

/**
 * Check if the user is within a subscription limit.
 * Use before creating new resources (portfolios, properties, etc.).
 */
export async function checkLimitAccess(
	userId: string,
	limit: LimitKey,
	currentCount: number,
): Promise<boolean> {
	const tier = await getUserTier(userId);
	return isWithinLimit(tier, limit, currentCount);
}
