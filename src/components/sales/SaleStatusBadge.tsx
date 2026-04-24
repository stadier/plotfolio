"use client";

import { formatCurrency } from "@/lib/utils";
import type { ActiveSaleSummary } from "@/types/property";
import { Gavel, Handshake, Timer } from "lucide-react";
import { useEffect, useState } from "react";

interface SaleStatusBadgeProps {
	sale: ActiveSaleSummary;
	country?: string;
	/** Compact pill for card thumbnails (default) or expanded for list rows */
	variant?: "pill" | "row";
}

function formatRemaining(ms: number): string {
	if (ms <= 0) return "Ended";
	const totalSec = Math.floor(ms / 1000);
	const d = Math.floor(totalSec / 86400);
	const h = Math.floor((totalSec % 86400) / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

/**
 * Compact badge displayed on marketplace cards / list rows to surface
 * an active sale (auction or private offers) on a property.
 */
export default function SaleStatusBadge({
	sale,
	country,
	variant = "pill",
}: SaleStatusBadgeProps) {
	const isAuction = sale.type === "auction";
	const endsAt = sale.auctionEndsAt
		? new Date(sale.auctionEndsAt).getTime()
		: null;
	const [now, setNow] = useState<number>(() => Date.now());
	useEffect(() => {
		if (!endsAt) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [endsAt]);
	const remaining = endsAt ? endsAt - now : null;
	const endingSoon =
		remaining != null && remaining > 0 && remaining < 3_600_000;

	if (variant === "pill") {
		const Icon = isAuction ? Gavel : Handshake;
		const label = isAuction
			? endsAt
				? remaining != null && remaining > 0
					? `Auction · ${formatRemaining(remaining)}`
					: "Auction · Ended"
				: "Auction"
			: "Open offers";
		return (
			<span
				className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full typo-badge font-bold uppercase tracking-widest shadow-sm ${
					endingSoon
						? "bg-rose-600 text-white"
						: isAuction
							? "bg-amber-500 text-white"
							: "bg-blue-600 text-white"
				}`}
			>
				<Icon className="w-3 h-3" />
				{label}
			</span>
		);
	}

	// row variant — for compact list use
	const topBid = sale.bidStats?.topAmount ?? sale.askingPrice;
	return (
		<div className="flex items-center gap-2 text-xs text-on-surface-variant max-w-xs">
			{isAuction ? (
				<>
					<Gavel className="w-3.5 h-3.5 text-amber-500" />
					<span className="font-semibold text-on-surface">
						{formatCurrency(topBid, country)}
					</span>
					<span>·</span>
					<span>{sale.bidStats?.count ?? 0} bids</span>
					{remaining != null && (
						<>
							<span>·</span>
							<span
								className={`inline-flex items-center gap-0.5 ${endingSoon ? "text-rose-600 font-semibold" : ""}`}
							>
								<Timer className="w-3 h-3" /> {formatRemaining(remaining)}
							</span>
						</>
					)}
				</>
			) : (
				<>
					<Handshake className="w-3.5 h-3.5 text-blue-600" />
					<span className="font-semibold text-on-surface">
						{formatCurrency(sale.askingPrice, country)}
					</span>
					<span>·</span>
					<span>Accepting offers</span>
				</>
			)}
		</div>
	);
}
