"use client";

import { useAuth } from "@/components/AuthContext";
import OffersPanel from "@/components/sales/OffersPanel";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { BidAPI, SaleAPI } from "@/lib/salesApi";
import { formatCurrency } from "@/lib/utils";
import { Bid, Sale, SaleStatus, SaleType } from "@/types/sale";
import {
	ArrowRight,
	Clock,
	Gavel,
	Handshake,
	Loader2,
	Timer,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ActiveSalePanelProps {
	propertyId: string;
	country?: string;
	/** True when the viewer owns the property */
	isOwner?: boolean;
	/** Hide the embedded offers list (e.g. on cards) */
	compact?: boolean;
	/** Called once the sale presence is known (true if a non-terminal sale exists) */
	onSaleDetected?: (hasSale: boolean) => void;
}

/**
 * Shows the live sale state for a property: an auction (with current bid,
 * countdown, recent bids, and a place-bid form for buyers) or a private
 * sale with the embedded `OffersPanel`. Self-fetches the sale + bids.
 */
export default function ActiveSalePanel({
	propertyId,
	country,
	isOwner,
	compact,
	onSaleDetected,
}: ActiveSalePanelProps) {
	const { user } = useAuth();
	const [sale, setSale] = useState<Sale | null>(null);
	const [bids, setBids] = useState<Bid[]>([]);
	const [loading, setLoading] = useState(true);
	const [bidAmount, setBidAmount] = useState("");
	const [placing, setPlacing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadSale = useCallback(async () => {
		const all = await SaleAPI.list({ propertyId });
		const live = all.find(
			(s) =>
				s.status !== SaleStatus.COMPLETED && s.status !== SaleStatus.CANCELLED,
		);
		setSale(live ?? null);
		setLoading(false);
		onSaleDetected?.(Boolean(live));
		if (live && live.type === SaleType.AUCTION) {
			const list = await BidAPI.list({ saleId: live.id });
			setBids(list);
		} else {
			setBids([]);
		}
	}, [propertyId, onSaleDetected]);

	useEffect(() => {
		loadSale();
	}, [loadSale]);

	// Poll auctions for live updates
	useEffect(() => {
		if (!sale || sale.type !== SaleType.AUCTION) return;
		const id = setInterval(() => loadSale(), 8000);
		return () => clearInterval(id);
	}, [sale, loadSale]);

	const sortedBids = useMemo(
		() => [...bids].sort((a, b) => b.amount - a.amount),
		[bids],
	);
	const topBid = sortedBids[0];

	const endsAt = sale?.auctionEndsAt
		? new Date(sale.auctionEndsAt).getTime()
		: null;
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!endsAt) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [endsAt]);
	const remainingMs = endsAt ? endsAt - now : null;
	const auctionEnded = remainingMs != null && remainingMs <= 0;
	const endingSoon =
		remainingMs != null && remainingMs > 0 && remainingMs < 3_600_000;

	async function handlePlaceBid(e: React.FormEvent) {
		e.preventDefault();
		if (!sale) return;
		const amount = parseFloat(bidAmount);
		if (!amount || amount <= 0) {
			setError("Enter a valid bid amount");
			return;
		}
		setPlacing(true);
		setError(null);
		const { error: err } = await BidAPI.place(sale.id, amount);
		setPlacing(false);
		if (err) {
			setError(err);
			return;
		}
		setBidAmount("");
		loadSale();
	}

	if (loading) {
		return (
			<div className="text-sm text-on-surface-variant flex items-center gap-2">
				<Loader2 className="w-4 h-4 animate-spin" />
				Checking sale status…
			</div>
		);
	}

	if (!sale) return null;

	const isAuction = sale.type === SaleType.AUCTION;
	const isSeller = Boolean(user && sale.sellerId === user.id);
	const hideBidForm = isOwner || isSeller;
	const minBid =
		(topBid?.amount ?? sale.askingPrice) +
		(sale.settings?.minBidIncrement ?? 0);
	const reserveMet =
		sale.reservePrice != null && (topBid?.amount ?? 0) >= sale.reservePrice;

	return (
		<div className="space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2">
					{isAuction ? (
						<Gavel className="w-4 h-4 text-amber-500" />
					) : (
						<Handshake className="w-4 h-4 text-blue-600" />
					)}
					<h3 className="font-headline font-bold text-sm text-on-surface uppercase tracking-widest">
						{isAuction ? "Live auction" : "Private sale"}
					</h3>
				</div>
				{isAuction && remainingMs != null && (
					<span
						className={`inline-flex items-center gap-1 typo-badge font-bold uppercase tracking-widest px-2 py-1.5 rounded-full ${
							auctionEnded
								? "bg-on-surface-variant/10 text-on-surface-variant"
								: endingSoon
									? "bg-rose-600 text-white"
									: "bg-amber-500 text-white"
						}`}
					>
						<Timer className="w-3 h-3" />
						{auctionEnded ? "Ended" : formatRemaining(remainingMs)}
					</span>
				)}
			</div>

			{isAuction ? (
				<div className="space-y-2">
					<div className="flex items-baseline gap-2">
						<span className="text-xs text-on-surface-variant font-body">
							{topBid ? "Top bid" : "Starting bid"}
						</span>
						<span className="text-lg font-bold text-on-surface">
							{formatCurrency(topBid?.amount ?? sale.askingPrice, country)}
						</span>
						{sale.reservePrice != null && (
							<span
								className={`typo-badge font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
									reserveMet
										? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
										: "bg-amber-500/10 text-amber-600 border border-amber-500/30"
								}`}
							>
								{reserveMet ? "Reserve met" : "Below reserve"}
							</span>
						)}
					</div>
					<div className="flex items-center gap-3 text-xs text-on-surface-variant">
						<span className="inline-flex items-center gap-1">
							<TrendingUp className="w-3 h-3" /> {bids.length} bids
						</span>
						{sale.auctionEndsAt && (
							<span className="inline-flex items-center gap-1">
								<Clock className="w-3 h-3" />
								Ends {new Date(sale.auctionEndsAt).toLocaleString()}
							</span>
						)}
					</div>

					{!compact && sortedBids.length > 0 && (
						<div className="border border-border rounded-md divide-y divide-border max-h-48 overflow-y-auto">
							{sortedBids.slice(0, 8).map((b, i) => (
								<div
									key={b.id}
									className="flex items-center justify-between px-3 py-2 text-xs"
								>
									<div className="flex items-center gap-2">
										<span
											className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold ${
												i === 0
													? "bg-amber-500 text-white"
													: "bg-surface-container text-on-surface-variant"
											}`}
										>
											{i + 1}
										</span>
										<span className="font-medium text-on-surface">
											{b.bidderName}
										</span>
									</div>
									<span className="font-mono font-semibold text-on-surface">
										{formatCurrency(b.amount, country)}
									</span>
								</div>
							))}
						</div>
					)}

					{!hideBidForm && !auctionEnded && user && (
						<form
							onSubmit={handlePlaceBid}
							className="flex flex-col sm:flex-row gap-2 pt-1"
						>
							<input
								type="number"
								min={minBid}
								step="any"
								placeholder={`Min ${formatCurrency(minBid, country)}`}
								value={bidAmount}
								onChange={(e) => setBidAmount(e.target.value)}
								className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
							/>
							<PrimaryButton type="submit" disabled={placing}>
								{placing ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<ArrowRight className="w-4 h-4" />
								)}
								Place bid
							</PrimaryButton>
						</form>
					)}

					{!user && (
						<div className="text-xs text-on-surface-variant font-body">
							<Link
								href={`/login?next=/marketplace/${propertyId}/auction`}
								className="text-blue-600 hover:text-blue-700 font-semibold"
							>
								Sign in
							</Link>{" "}
							to place a bid.
						</div>
					)}

					{hideBidForm && !auctionEnded && (
						<div className="text-xs text-on-surface-variant font-body italic">
							You are the seller — monitor bids and accept the winning bid when
							the auction closes.
						</div>
					)}

					{error && (
						<div className="text-xs text-rose-600 font-body">{error}</div>
					)}

					{!compact && (
						<Link
							href={`/marketplace/${propertyId}/auction`}
							className="text-blue-600 hover:text-blue-700 typo-badge font-bold uppercase tracking-widest inline-flex items-center gap-1"
						>
							Open full auction page <ArrowRight className="w-3 h-3" />
						</Link>
					)}
				</div>
			) : (
				<div className="space-y-3">
					<div className="flex items-baseline gap-2">
						<span className="text-xs text-on-surface-variant font-body">
							Asking
						</span>
						<span className="text-lg font-bold text-on-surface">
							{formatCurrency(sale.askingPrice, country)}
						</span>
					</div>
					{!compact && (
						<OffersPanel
							propertyId={propertyId}
							isOwner={Boolean(isOwner)}
							allowMakeOffer={!isOwner}
						/>
					)}
				</div>
			)}
		</div>
	);
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
