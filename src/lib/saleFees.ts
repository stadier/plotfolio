/**
 * Platform fee calculator. Resolves the fee owed on a sale based on
 * platform-wide settings and snapshots the config onto the Sale at
 * creation time so historical sales are immune to future setting changes.
 */

import {
	FeePaidBy,
	FeeType,
	PlatformSettings,
	SaleFeeSnapshot,
	SaleType,
	TieredFee,
} from "@/types/sale";

/** Build a fee snapshot from platform settings for a given sale type */
export function buildFeeSnapshot(
	settings: PlatformSettings,
	saleType: SaleType,
): SaleFeeSnapshot {
	const isAuction = saleType === SaleType.AUCTION;

	const feeType =
		(isAuction ? settings.auctionFeeType : undefined) ?? settings.feeType;
	const feePercent =
		(isAuction ? settings.auctionFeePercent : undefined) ?? settings.feePercent;
	const flatFeeAmount =
		(isAuction ? settings.auctionFlatFeeAmount : undefined) ??
		settings.flatFeeAmount;
	const tieredFees =
		(isAuction ? settings.auctionTieredFees : undefined) ?? settings.tieredFees;

	return {
		feeType,
		feePercent,
		flatFeeAmount,
		tieredFees,
		feePaidBy: settings.feePaidBy,
		splitBuyerPercent: settings.splitBuyerPercent,
		minFeeAmount: settings.minFeeAmount,
		maxFeeAmount: settings.maxFeeAmount,
	};
}

/** Calculate the actual fee amount given a transaction amount */
export function calculateFee(
	snapshot: SaleFeeSnapshot,
	amount: number,
): number {
	if (amount <= 0) return 0;

	let fee = 0;

	switch (snapshot.feeType) {
		case FeeType.PERCENTAGE:
			fee = amount * ((snapshot.feePercent ?? 0) / 100);
			break;
		case FeeType.FLAT:
			fee = snapshot.flatFeeAmount ?? 0;
			break;
		case FeeType.TIERED: {
			const tiers = snapshot.tieredFees ?? [];
			const matched = matchTier(amount, tiers);
			fee = matched ? amount * (matched.percent / 100) : 0;
			break;
		}
	}

	if (snapshot.minFeeAmount && fee < snapshot.minFeeAmount)
		fee = snapshot.minFeeAmount;
	if (snapshot.maxFeeAmount && fee > snapshot.maxFeeAmount)
		fee = snapshot.maxFeeAmount;

	return Math.round(fee * 100) / 100;
}

function matchTier(amount: number, tiers: TieredFee[]): TieredFee | undefined {
	const sorted = [...tiers].sort((a, b) => a.upTo - b.upTo);
	for (const tier of sorted) {
		if (amount <= tier.upTo) return tier;
	}
	return sorted[sorted.length - 1];
}

/** Split the fee between buyer and seller per the configured rule */
export function splitFee(
	totalFee: number,
	snapshot: SaleFeeSnapshot,
): { buyer: number; seller: number } {
	switch (snapshot.feePaidBy) {
		case FeePaidBy.BUYER:
			return { buyer: totalFee, seller: 0 };
		case FeePaidBy.SELLER:
			return { buyer: 0, seller: totalFee };
		case FeePaidBy.SPLIT: {
			const buyerPct = snapshot.splitBuyerPercent ?? 50;
			const buyer = Math.round(totalFee * (buyerPct / 100) * 100) / 100;
			return { buyer, seller: Math.round((totalFee - buyer) * 100) / 100 };
		}
	}
}

/** Default platform settings used when no admin config exists yet */
export const DEFAULT_PLATFORM_SETTINGS: Omit<PlatformSettings, "id"> = {
	feeType: FeeType.PERCENTAGE,
	feePercent: 2.5,
	feePaidBy: FeePaidBy.BUYER,
	minFeeAmount: 0,
	auctionFeeType: FeeType.PERCENTAGE,
	auctionFeePercent: 3,
	autoApproveVerifications: false,
	verificationRequiredForBidding: true,
	verificationRequiredForOffers: true,
	defaultCurrency: "USD",
};
