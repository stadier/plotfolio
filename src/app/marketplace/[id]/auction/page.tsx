"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useProperty } from "@/hooks/usePropertyQueries";
import { BidAPI, SaleAPI } from "@/lib/salesApi";
import { Bid, Sale, SaleStatus, SaleType } from "@/types/sale";
import { Clock, Gavel, Loader2, TrendingUp } from "lucide-react";
import { use, useEffect, useState } from "react";

function useCountdown(target?: string) {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);
	if (!target) return null;
	const diff = new Date(target).getTime() - now;
	if (diff <= 0) return "Auction ended";
	const days = Math.floor(diff / 86400000);
	const hours = Math.floor((diff % 86400000) / 3600000);
	const mins = Math.floor((diff % 3600000) / 60000);
	const secs = Math.floor((diff % 60000) / 1000);
	if (days > 0) return `${days}d ${hours}h ${mins}m`;
	return `${hours}h ${mins}m ${secs}s`;
}

export default function AuctionPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { user } = useAuth();
	const { data: property } = useProperty(id);

	const [sale, setSale] = useState<Sale | null>(null);
	const [bids, setBids] = useState<Bid[]>([]);
	const [bidAmount, setBidAmount] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const countdown = useCountdown(sale?.auctionEndsAt);

	const refresh = async () => {
		const list = await SaleAPI.list({ propertyId: id });
		const auction = list.find(
			(s) => s.type === SaleType.AUCTION && s.status === SaleStatus.ACTIVE,
		);
		setSale(auction ?? null);
		if (auction) {
			const b = await BidAPI.list({ saleId: auction.id });
			setBids(b);
		}
		setLoading(false);
	};

	useEffect(() => {
		refresh();
		const t = setInterval(refresh, 8000); // light polling
		return () => clearInterval(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const highest = bids[0];
	const minNext =
		(highest?.amount ?? sale?.askingPrice ?? 0) +
		(sale?.settings.minBidIncrement ?? 100);

	const handleBid = async () => {
		if (!sale) return;
		const amt = parseFloat(bidAmount);
		if (!amt || amt < minNext) {
			setError(
				`Bid must be at least ${sale.currency} ${minNext.toLocaleString()}`,
			);
			return;
		}
		setBusy(true);
		setError(null);
		const { error: err } = await BidAPI.place(sale.id, amt);
		setBusy(false);
		if (err) {
			setError(err);
			return;
		}
		setBidAmount("");
		await refresh();
	};

	if (loading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
				</div>
			</AppShell>
		);
	}

	if (!sale) {
		return (
			<AppShell>
				<div className="px-4 sm:px-8 py-8 max-w-2xl">
					<BackButton fallbackHref={`/marketplace/${id}`} label="Listing" />
					<div className="mt-6 bg-card border border-border rounded-xl p-6">
						<h2 className="font-headline font-bold text-lg text-on-surface">
							No active auction
						</h2>
						<p className="text-sm text-on-surface-variant font-body mt-2">
							This property is not currently up for auction.
						</p>
					</div>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable>
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4">
				<div className="flex items-center gap-3 max-w-4xl">
					<BackButton fallbackHref={`/marketplace/${id}`} label="Listing" />
					<span className="text-outline-variant hidden sm:inline">/</span>
					<h1 className="font-headline text-sm font-semibold text-primary truncate">
						Auction · {property?.name ?? sale.propertyName}
					</h1>
				</div>
			</div>

			<div className="px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full grid md:grid-cols-2 gap-6">
				{/* Bid summary */}
				<div className="bg-card border border-border rounded-xl p-6 max-w-md">
					<div className="flex items-center gap-2 text-blue-600 mb-2">
						<Gavel className="w-5 h-5" />
						<span className="font-headline font-bold text-xs uppercase tracking-widest">
							Live auction
						</span>
					</div>

					<div className="text-3xl font-headline font-bold text-on-surface">
						{sale.currency}{" "}
						{(highest?.amount ?? sale.askingPrice).toLocaleString()}
					</div>
					<div className="text-xs text-on-surface-variant font-body mt-1">
						{highest
							? `Current bid · ${bids.length} bids`
							: `Starting bid · No bids yet`}
					</div>

					{sale.reservePrice && (
						<div className="mt-2 text-xs font-body">
							<span className="text-on-surface-variant">Reserve: </span>
							<span
								className={
									(highest?.amount ?? 0) >= sale.reservePrice
										? "text-emerald-600 font-bold"
										: "text-rose-500 font-bold"
								}
							>
								{(highest?.amount ?? 0) >= sale.reservePrice
									? "Met"
									: "Not met"}
							</span>
						</div>
					)}

					<div className="mt-4 flex items-center gap-2 text-on-surface">
						<Clock className="w-4 h-4 text-on-surface-variant" />
						<span className="font-headline font-bold">{countdown}</span>
					</div>

					{user && user.id !== sale.sellerId ? (
						<div className="mt-5 space-y-2">
							<input
								type="number"
								value={bidAmount}
								onChange={(e) => setBidAmount(e.target.value)}
								placeholder={`Min ${sale.currency} ${minNext.toLocaleString()}`}
								className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
							/>
							<PrimaryButton
								onClick={handleBid}
								disabled={busy}
								className="w-full justify-center"
							>
								{busy ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<TrendingUp className="w-4 h-4" />
								)}
								Place bid
							</PrimaryButton>
							{error && (
								<div className="text-xs text-rose-500 font-body">{error}</div>
							)}
						</div>
					) : (
						<div className="mt-5 text-xs text-on-surface-variant font-body italic">
							{user
								? "You are the seller — you can't bid on your own auction."
								: "Sign in to place a bid."}
						</div>
					)}
				</div>

				{/* Bid history */}
				<div className="bg-card border border-border rounded-xl p-6 max-w-md">
					<h3 className="font-headline font-bold text-on-surface mb-3">
						Bid history
					</h3>
					{bids.length === 0 ? (
						<div className="text-sm text-on-surface-variant font-body italic">
							No bids yet — be the first.
						</div>
					) : (
						<ul className="space-y-2 max-h-96 overflow-auto">
							{bids.map((b) => (
								<li
									key={b.id}
									className="flex items-center justify-between bg-surface-container rounded-md px-3 py-2"
								>
									<div className="min-w-0">
										<div className="font-headline font-bold text-sm text-on-surface truncate">
											{b.bidderName}
										</div>
										<div className="text-xs text-outline font-body">
											{b.createdAt
												? new Date(b.createdAt).toLocaleString()
												: ""}
										</div>
									</div>
									<div className="text-right">
										<div className="font-headline font-bold text-on-surface">
											{b.currency} {b.amount.toLocaleString()}
										</div>
										<div className="text-badge uppercase tracking-widest font-headline font-bold text-on-surface-variant">
											{b.status}
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</AppShell>
	);
}
