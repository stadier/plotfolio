"use client";

import {
	FeatureKey,
	isWithinLimit,
	LimitKey,
	SubscriptionStatus,
	SubscriptionTier,
	TIER_CONFIGS,
	tierAllowsFeature,
	TierConfig,
} from "@/types/subscription";
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useAuth } from "./AuthContext";

interface SubscriptionState {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	cancelAtPeriodEnd: boolean;
	currentPeriodEnd?: string;
	gateway?: string;
}

interface SubscriptionContextValue {
	subscription: SubscriptionState | null;
	tiers: TierConfig[];
	loading: boolean;
	/** Check if a feature is enabled by the current subscription */
	hasFeature: (feature: FeatureKey) => boolean;
	/** Check if a limit allows one more (pass current count) */
	withinLimit: (limit: LimitKey, currentCount: number) => boolean;
	/** Current tier config */
	tierConfig: TierConfig;
	/** Start checkout for an upgrade */
	checkout: (
		tier: SubscriptionTier,
		billingInterval?: "monthly" | "yearly",
		gateway?: "stripe" | "paystack",
	) => Promise<void>;
	/** Cancel current subscription */
	cancel: () => Promise<void>;
	/** Resume a cancelled subscription */
	resume: () => Promise<void>;
	/** Open billing portal */
	openPortal: () => Promise<void>;
	/** Refresh subscription data */
	refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
	null,
);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [subscription, setSubscription] = useState<SubscriptionState | null>(
		null,
	);
	const [tiers, setTiers] = useState<TierConfig[]>(Object.values(TIER_CONFIGS));
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		if (!user) {
			setSubscription(null);
			setLoading(false);
			return;
		}
		try {
			const res = await fetch("/api/subscriptions");
			if (res.ok) {
				const data = await res.json();
				setSubscription(data.subscription ?? null);
				if (data.tiers) setTiers(data.tiers);
			}
		} catch {
			// Silently fail — user keeps free tier
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const currentTier = subscription?.tier ?? SubscriptionTier.FREE;
	const tierConfig = TIER_CONFIGS[currentTier];

	const hasFeature = useCallback(
		(feature: FeatureKey) => tierAllowsFeature(currentTier, feature),
		[currentTier],
	);

	const withinLimit = useCallback(
		(limit: LimitKey, currentCount: number) =>
			isWithinLimit(currentTier, limit, currentCount),
		[currentTier],
	);

	const checkout = useCallback(
		async (
			tier: SubscriptionTier,
			billingInterval: "monthly" | "yearly" = "monthly",
			gateway?: "stripe" | "paystack",
		) => {
			const res = await fetch("/api/subscriptions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tier, billingInterval, gateway }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Checkout failed");
			}
			const data = await res.json();
			if (data.checkoutUrl) {
				window.location.href = data.checkoutUrl;
			}
		},
		[],
	);

	const cancel = useCallback(async () => {
		await fetch("/api/subscriptions", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "cancel" }),
		});
		await refresh();
	}, [refresh]);

	const resume = useCallback(async () => {
		await fetch("/api/subscriptions", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "resume" }),
		});
		await refresh();
	}, [refresh]);

	const openPortal = useCallback(async () => {
		const res = await fetch("/api/subscriptions", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "portal" }),
		});
		if (res.ok) {
			const data = await res.json();
			if (data.url) window.location.href = data.url;
		}
	}, []);

	return (
		<SubscriptionContext.Provider
			value={{
				subscription,
				tiers,
				loading,
				hasFeature,
				withinLimit,
				tierConfig,
				checkout,
				cancel,
				resume,
				openPortal,
				refresh,
			}}
		>
			{children}
		</SubscriptionContext.Provider>
	);
}

export function useSubscription() {
	const ctx = useContext(SubscriptionContext);
	if (!ctx) {
		throw new Error("useSubscription must be used within SubscriptionProvider");
	}
	return ctx;
}
