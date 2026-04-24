"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import OffersPanel from "@/components/sales/OffersPanel";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SignaturePad from "@/components/ui/SignaturePad";
import { useProperty } from "@/hooks/usePropertyQueries";
import { SaleAPI } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import {
	PaymentMethod,
	Sale,
	SaleStatus,
	SaleStep,
	SaleType,
} from "@/types/sale";
import {
	ArrowRight,
	Check,
	FileText,
	Gavel,
	Handshake,
	Loader2,
	Stamp,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

const STEP_LABELS: { key: SaleStep; label: string }[] = [
	{ key: SaleStep.SETUP, label: "Setup" },
	{ key: SaleStep.INVITE, label: "Invite" },
	{ key: SaleStep.OFFER_REVIEW, label: "Offer" },
	{ key: SaleStep.CONTRACT, label: "Contract" },
	{ key: SaleStep.SIGNING, label: "Sign" },
	{ key: SaleStep.PAYMENT, label: "Payment" },
	{ key: SaleStep.STAMPING, label: "Stamp" },
	{ key: SaleStep.COMPLETE, label: "Complete" },
];

export default function SellPropertyPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { user } = useAuth();
	const { data: property, isLoading } = useProperty(id);

	const [sale, setSale] = useState<Sale | null>(null);
	const [loadingSale, setLoadingSale] = useState(true);

	// Setup form
	const [saleType, setSaleType] = useState<SaleType>(SaleType.PRIVATE_SALE);
	const [askingPrice, setAskingPrice] = useState("");
	const [reservePrice, setReservePrice] = useState("");
	const [auctionStart, setAuctionStart] = useState("");
	const [auctionEnd, setAuctionEnd] = useState("");
	const [requireVerified, setRequireVerified] = useState(true);
	const [allowInstallments, setAllowInstallments] = useState(false);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [signing, setSigning] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
		PaymentMethod.PLATFORM_STRIPE,
	);
	const [paymentRef, setPaymentRef] = useState("");
	const [actionBusy, setActionBusy] = useState(false);

	// Look for an existing in-progress sale on this property
	useEffect(() => {
		(async () => {
			setLoadingSale(true);
			const list = await SaleAPI.list({ propertyId: id });
			const inProgress = list.find(
				(s) =>
					s.status !== SaleStatus.COMPLETED &&
					s.status !== SaleStatus.CANCELLED,
			);
			setSale(inProgress ?? null);
			setLoadingSale(false);
		})();
	}, [id]);

	const currentStepIndex = useMemo(() => {
		if (!sale) return 0;
		return Math.max(
			0,
			STEP_LABELS.findIndex((s) => s.key === sale.currentStep),
		);
	}, [sale]);

	const handleCreate = async () => {
		const ap = parseFloat(askingPrice);
		if (!ap || ap <= 0) {
			setError("Asking price required");
			return;
		}
		setCreating(true);
		setError(null);
		const { sale: created, error: err } = await SaleAPI.create({
			type: saleType,
			propertyId: id,
			askingPrice: ap,
			reservePrice: reservePrice ? parseFloat(reservePrice) : undefined,
			currency: property?.currency ?? "USD",
			settings: {
				requireVerifiedBuyer: requireVerified,
				allowInstallments,
			},
			auctionStartsAt: saleType === SaleType.AUCTION ? auctionStart : undefined,
			auctionEndsAt: saleType === SaleType.AUCTION ? auctionEnd : undefined,
		});
		setCreating(false);
		if (err) {
			setError(err);
			return;
		}
		setSale(created!);
	};

	const handleSellerSign = async (signature: string) => {
		if (!sale) return;
		setActionBusy(true);
		const { sale: updated, error: err } = await SaleAPI.sign(
			sale.id,
			"seller",
			signature,
		);
		setActionBusy(false);
		setSigning(false);
		if (err) {
			setError(err);
			return;
		}
		setSale(updated!);
	};

	const handleConfirmPayment = async () => {
		if (!sale) return;
		setActionBusy(true);
		const { sale: updated, error: err } = await SaleAPI.confirmPayment(sale.id);
		setActionBusy(false);
		if (err) {
			setError(err);
			return;
		}
		setSale(updated!);
	};

	const handleStamp = async () => {
		if (!sale) return;
		setActionBusy(true);
		const { sale: updated, error: err } = await SaleAPI.stamp(sale.id, {});
		setActionBusy(false);
		if (err) {
			setError(err);
			return;
		}
		setSale(updated!);
	};

	const handleCancel = async () => {
		if (!sale) return;
		if (!confirm("Cancel this sale? This cannot be undone.")) return;
		setActionBusy(true);
		const { sale: updated } = await SaleAPI.cancel(sale.id, "Seller cancelled");
		setActionBusy(false);
		setSale(updated ?? null);
	};

	if (isLoading || loadingSale) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
				</div>
			</AppShell>
		);
	}

	if (!property) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center font-body text-on-surface-variant">
					Property not found
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable>
			{/* Header */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4">
				<div className="flex items-center gap-3 max-w-4xl">
					<BackButton
						fallbackHref={`/portfolio/properties/${id}`}
						label="Property"
					/>
					<span className="text-outline-variant hidden sm:inline">/</span>
					<h1 className="font-headline text-sm font-semibold text-primary truncate">
						Sell · {property.name}
					</h1>
				</div>
			</div>

			<div className="px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full space-y-6">
				{/* Step indicator */}
				{sale && (
					<div className="bg-card border border-border rounded-xl p-4">
						<div className="flex items-center gap-1 overflow-x-auto">
							{STEP_LABELS.map((s, idx) => {
								const isActive = idx === currentStepIndex;
								const isDone = idx < currentStepIndex;
								return (
									<div key={s.key} className="flex items-center shrink-0">
										<div
											className={cn(
												"flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-widest font-headline font-bold border",
												isActive && "bg-blue-600 text-white border-blue-600",
												isDone &&
													"bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
												!isActive &&
													!isDone &&
													"bg-card text-on-surface-variant border-border",
											)}
										>
											{isDone ? (
												<Check className="w-3 h-3" />
											) : (
												<span>{idx + 1}</span>
											)}
											{s.label}
										</div>
										{idx < STEP_LABELS.length - 1 && (
											<ArrowRight className="w-3 h-3 mx-1 text-outline shrink-0" />
										)}
									</div>
								);
							})}
						</div>
						<div className="mt-3 flex items-center justify-between">
							<div className="text-xs text-on-surface-variant font-body">
								Status: <span className="font-bold">{sale.status}</span>
							</div>
							<button
								onClick={handleCancel}
								className="text-[11px] uppercase tracking-widest font-headline font-bold text-rose-500 hover:text-rose-600"
							>
								Cancel sale
							</button>
						</div>
					</div>
				)}

				{error && (
					<div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md px-4 py-2 text-sm font-body">
						{error}
					</div>
				)}

				{/* SETUP */}
				{!sale && (
					<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-4">
						<h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
							<Handshake className="w-5 h-5 text-blue-600" />
							Initiate sale
						</h2>

						<div className="grid grid-cols-2 gap-2">
							<button
								onClick={() => setSaleType(SaleType.PRIVATE_SALE)}
								className={cn(
									"p-4 rounded-md border text-left transition-colors",
									saleType === SaleType.PRIVATE_SALE
										? "bg-blue-600 text-white border-blue-600"
										: "bg-card text-on-surface border-border hover:bg-surface-container",
								)}
							>
								<Handshake className="w-5 h-5 mb-2" />
								<div className="font-headline font-bold text-sm uppercase tracking-widest">
									Private sale
								</div>
								<div className="text-xs opacity-80 mt-1 font-body normal-case tracking-normal">
									Receive offers and negotiate
								</div>
							</button>
							<button
								onClick={() => setSaleType(SaleType.AUCTION)}
								className={cn(
									"p-4 rounded-md border text-left transition-colors",
									saleType === SaleType.AUCTION
										? "bg-blue-600 text-white border-blue-600"
										: "bg-card text-on-surface border-border hover:bg-surface-container",
								)}
							>
								<Gavel className="w-5 h-5 mb-2" />
								<div className="font-headline font-bold text-sm uppercase tracking-widest">
									Auction
								</div>
								<div className="text-xs opacity-80 mt-1 font-body normal-case tracking-normal">
									Time-bound bidding
								</div>
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									{saleType === SaleType.AUCTION
										? "Starting price"
										: "Asking price"}
								</label>
								<input
									type="number"
									value={askingPrice}
									onChange={(e) => setAskingPrice(e.target.value)}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
								/>
							</div>
							{saleType === SaleType.AUCTION && (
								<div>
									<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
										Reserve (optional)
									</label>
									<input
										type="number"
										value={reservePrice}
										onChange={(e) => setReservePrice(e.target.value)}
										className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
									/>
								</div>
							)}
						</div>

						{saleType === SaleType.AUCTION && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
										Auction starts
									</label>
									<input
										type="datetime-local"
										value={auctionStart}
										onChange={(e) => setAuctionStart(e.target.value)}
										className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
									/>
								</div>
								<div>
									<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
										Auction ends
									</label>
									<input
										type="datetime-local"
										value={auctionEnd}
										onChange={(e) => setAuctionEnd(e.target.value)}
										className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<label className="flex items-center gap-2 text-sm font-body text-on-surface">
								<input
									type="checkbox"
									checked={requireVerified}
									onChange={(e) => setRequireVerified(e.target.checked)}
								/>
								Only verified users can{" "}
								{saleType === SaleType.AUCTION ? "bid" : "make offers"}
							</label>
							<label className="flex items-center gap-2 text-sm font-body text-on-surface">
								<input
									type="checkbox"
									checked={allowInstallments}
									onChange={(e) => setAllowInstallments(e.target.checked)}
								/>
								Allow installment payment offers
							</label>
						</div>

						<PrimaryButton onClick={handleCreate} disabled={creating}>
							{creating ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Handshake className="w-4 h-4" />
							)}
							Create sale
						</PrimaryButton>
					</div>
				)}

				{/* DRAFT — needs to be activated (legacy / pre-activation sales) */}
				{sale && sale.status === SaleStatus.DRAFT && (
					<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-3">
						<h3 className="font-headline font-bold text-lg text-on-surface">
							Sale is in draft
						</h3>
						<p className="text-sm text-on-surface-variant font-body">
							Publish the sale to start accepting{" "}
							{sale.type === SaleType.AUCTION ? "bids" : "offers"}.
						</p>
						<PrimaryButton
							onClick={async () => {
								setActionBusy(true);
								const { sale: updated, error: err } = await SaleAPI.update(
									sale.id,
									{ status: SaleStatus.ACTIVE },
								);
								setActionBusy(false);
								if (err) {
									setError(err);
									return;
								}
								setSale(updated!);
							}}
							disabled={actionBusy}
						>
							{actionBusy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<ArrowRight className="w-4 h-4" />
							)}
							Publish sale
						</PrimaryButton>
					</div>
				)}

				{/* OFFERS / BIDS step */}
				{sale && sale.status === SaleStatus.ACTIVE && (
					<>
						{sale.type === SaleType.PRIVATE_SALE ? (
							<OffersPanel
								propertyId={id}
								isOwner
								onOfferAccepted={(s) => setSale(s)}
							/>
						) : (
							<div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
								<h3 className="font-headline font-bold text-lg text-on-surface mb-2 flex items-center gap-2">
									<Gavel className="w-5 h-5 text-blue-600" />
									Auction live
								</h3>
								<p className="text-sm text-on-surface-variant font-body">
									Bidders can place bids on the public auction page.
								</p>
								<Link
									href={`/marketplace/${id}/auction`}
									className="text-blue-600 hover:text-blue-700 text-xs uppercase tracking-widest font-headline font-bold mt-2 inline-block"
								>
									Open auction page →
								</Link>
								{sale.auctionEndsAt && (
									<div className="mt-3 text-xs text-on-surface-variant font-body">
										Ends: {new Date(sale.auctionEndsAt).toLocaleString()}
									</div>
								)}
							</div>
						)}
					</>
				)}

				{/* CONTRACT preview */}
				{sale &&
					(sale.status === SaleStatus.UNDER_OFFER ||
						sale.status === SaleStatus.UNDER_CONTRACT) && (
						<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-3">
							<h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
								<FileText className="w-5 h-5 text-blue-600" />
								Contract
							</h3>
							{sale.contractHtml ? (
								<div
									className="bg-surface-container rounded-md p-4 max-h-96 overflow-auto prose prose-sm dark:prose-invert max-w-none"
									dangerouslySetInnerHTML={{ __html: sale.contractHtml }}
								/>
							) : (
								<div className="text-sm text-on-surface-variant font-body italic">
									Contract will be generated automatically.
								</div>
							)}
							{sale.country && (
								<div className="text-xs text-on-surface-variant font-body">
									Jurisdiction: {sale.country}
									{sale.countryClauseTitles?.length
										? ` · ${sale.countryClauseTitles.length} country-specific clauses applied`
										: ""}
								</div>
							)}
							<PrimaryButton
								onClick={() => setSigning(true)}
								disabled={!!sale.sellerSignature}
							>
								{sale.sellerSignature ? (
									<>
										<Check className="w-4 h-4" /> You have signed
									</>
								) : (
									<>Sign as seller</>
								)}
							</PrimaryButton>
							{sale.buyerSignature ? (
								<div className="text-xs text-emerald-600 font-body">
									✓ Buyer has signed
								</div>
							) : (
								<div className="text-xs text-on-surface-variant font-body">
									Awaiting buyer signature
								</div>
							)}
						</div>
					)}

				{/* SIGNING modal */}
				{signing && sale && (
					<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
						<div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
							<SignaturePad
								name={sale.sellerName}
								onConfirm={handleSellerSign}
								onCancel={() => setSigning(false)}
							/>
						</div>
					</div>
				)}

				{/* PAYMENT */}
				{sale && sale.status === SaleStatus.AWAITING_PAYMENT && (
					<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-3">
						<h3 className="font-headline font-bold text-lg text-on-surface">
							Confirm payment
						</h3>
						<p className="text-sm text-on-surface-variant font-body">
							Buyer should submit payment. Once received, mark the sale as paid.
						</p>
						{sale.paymentMethod && (
							<div className="text-xs text-on-surface-variant font-body">
								Buyer indicated:{" "}
								<span className="font-bold">{sale.paymentMethod}</span>
								{sale.paymentReference && ` · ${sale.paymentReference}`}
							</div>
						)}
						<PrimaryButton onClick={handleConfirmPayment} disabled={actionBusy}>
							{actionBusy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Check className="w-4 h-4" />
							)}
							Confirm payment received
						</PrimaryButton>
					</div>
				)}

				{/* STAMPING */}
				{sale && sale.status === SaleStatus.PAYMENT_RECEIVED && (
					<div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-3">
						<h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
							<Stamp className="w-5 h-5 text-blue-600" />
							Stamp & finalise
						</h3>
						<p className="text-sm text-on-surface-variant font-body">
							Apply your seal and finalise the contract. Ownership will transfer
							to the buyer immediately after stamping.
						</p>
						<PrimaryButton onClick={handleStamp} disabled={actionBusy}>
							{actionBusy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Stamp className="w-4 h-4" />
							)}
							Stamp & complete sale
						</PrimaryButton>
					</div>
				)}

				{/* COMPLETED */}
				{sale && sale.status === SaleStatus.COMPLETED && (
					<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 max-w-2xl">
						<h3 className="font-headline font-bold text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
							<Check className="w-5 h-5" /> Sale completed
						</h3>
						<p className="text-sm text-on-surface-variant font-body mt-2">
							Ownership has been transferred to{" "}
							<span className="font-bold">{sale.buyerName}</span>. The history
							record has been updated.
						</p>
						<Link
							href={`/portfolio/properties/${id}`}
							className="text-blue-600 hover:text-blue-700 text-xs uppercase tracking-widest font-headline font-bold mt-3 inline-block"
						>
							← Back to property
						</Link>
					</div>
				)}
			</div>
		</AppShell>
	);
}
