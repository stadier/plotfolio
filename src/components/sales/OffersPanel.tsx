"use client";

import { useAuth } from "@/components/AuthContext";
import { useProperty } from "@/hooks/usePropertyQueries";
import { OfferAPI } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import { InstallmentPlan, Offer, OfferStatus, Sale } from "@/types/sale";
import { Calendar, Check, DollarSign, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

interface OffersPanelProps {
	propertyId: string;
	/** When true, current user is the seller and can act on offers */
	isOwner: boolean;
	/** Optional callback after an offer is accepted (sale is created) */
	onOfferAccepted?: (sale: Sale) => void;
	/** Show empty-state CTA encouraging buyers to make an offer */
	allowMakeOffer?: boolean;
}

const STATUS_BADGES: Record<OfferStatus, string> = {
	[OfferStatus.PENDING]:
		"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
	[OfferStatus.ACCEPTED]:
		"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
	[OfferStatus.COUNTERED]:
		"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
	[OfferStatus.REJECTED]:
		"bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
	[OfferStatus.WITHDRAWN]:
		"bg-on-surface-variant/10 text-on-surface-variant border-border",
	[OfferStatus.EXPIRED]:
		"bg-on-surface-variant/10 text-on-surface-variant border-border",
};

export default function OffersPanel({
	propertyId,
	isOwner,
	onOfferAccepted,
	allowMakeOffer,
}: OffersPanelProps) {
	const { user } = useAuth();
	const { data: property } = useProperty(propertyId);

	const [offers, setOffers] = useState<Offer[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [counterFor, setCounterFor] = useState<string | null>(null);
	const [counterAmount, setCounterAmount] = useState("");
	const [makeOfferOpen, setMakeOfferOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// New offer form
	const [newAmount, setNewAmount] = useState("");
	const [newMessage, setNewMessage] = useState("");
	const [newPaymentType, setNewPaymentType] = useState<"full" | "installment">(
		"full",
	);
	const [installmentMonths, setInstallmentMonths] = useState(12);
	const [downPayment, setDownPayment] = useState("");

	const refresh = async () => {
		setLoading(true);
		const list = await OfferAPI.list({ propertyId });
		setOffers(list);
		setLoading(false);
	};

	useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [propertyId]);

	const handleAccept = async (offerId: string) => {
		setBusyId(offerId);
		setError(null);
		const { data, error: err } = await OfferAPI.accept(offerId);
		setBusyId(null);
		if (err) {
			setError(err);
			return;
		}
		await refresh();
		if (data?.sale && onOfferAccepted) onOfferAccepted(data.sale);
	};

	const handleReject = async (offerId: string) => {
		setBusyId(offerId);
		await OfferAPI.reject(offerId);
		setBusyId(null);
		await refresh();
	};

	const handleCounter = async (offerId: string) => {
		const amount = parseFloat(counterAmount);
		if (!amount || amount <= 0) return;
		setBusyId(offerId);
		await OfferAPI.counter(offerId, amount);
		setBusyId(null);
		setCounterFor(null);
		setCounterAmount("");
		await refresh();
	};

	const handleWithdraw = async (offerId: string) => {
		setBusyId(offerId);
		await OfferAPI.withdraw(offerId);
		setBusyId(null);
		await refresh();
	};

	const handleSubmitOffer = async () => {
		const amount = parseFloat(newAmount);
		if (!amount || amount <= 0) {
			setError("Enter a valid amount");
			return;
		}
		setError(null);
		setBusyId("__new__");
		let installmentPlan: InstallmentPlan | undefined;
		if (newPaymentType === "installment") {
			const dp = parseFloat(downPayment) || 0;
			const remaining = amount - dp;
			const monthly = remaining / installmentMonths;
			installmentPlan = {
				totalAmount: amount,
				downPayment: dp,
				installmentCount: installmentMonths,
				installmentAmount: monthly,
				startDate: new Date().toISOString(),
				frequency: "monthly",
				schedule: [],
			};
		}
		const { offer, error: err } = await OfferAPI.create({
			propertyId,
			amount,
			currency: property?.currency ?? "USD",
			paymentType: newPaymentType,
			installmentPlan,
			message: newMessage || undefined,
		});
		setBusyId(null);
		if (err) {
			setError(err);
			return;
		}
		setMakeOfferOpen(false);
		setNewAmount("");
		setNewMessage("");
		setDownPayment("");
		await refresh();
	};

	const visibleOffers = isOwner
		? offers
		: offers.filter((o) => o.buyerId === user?.id);

	return (
		<div className="bg-card border border-border rounded-xl p-4 sm:p-6 max-w-3xl">
			<div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
				<h3 className="font-headline font-bold text-lg text-on-surface">
					{isOwner ? "Offers Received" : "Your Offers"}
				</h3>
				{allowMakeOffer && !isOwner && user && (
					<button
						onClick={() => setMakeOfferOpen((v) => !v)}
						className="text-xs uppercase tracking-widest font-headline font-bold text-blue-600 hover:text-blue-700"
					>
						{makeOfferOpen ? "Cancel" : "Make an offer"}
					</button>
				)}
			</div>

			{error && (
				<div className="mb-3 text-xs text-rose-500 font-body">{error}</div>
			)}

			{makeOfferOpen && allowMakeOffer && (
				<div className="bg-surface-container rounded-md p-4 mb-4 space-y-3">
					<div>
						<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
							Offer amount ({property?.currency ?? "USD"})
						</label>
						<input
							type="number"
							value={newAmount}
							onChange={(e) => setNewAmount(e.target.value)}
							className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
							placeholder="0.00"
						/>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setNewPaymentType("full")}
							className={cn(
								"flex-1 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-headline font-bold border",
								newPaymentType === "full"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-card text-on-surface-variant border-border",
							)}
						>
							Full payment
						</button>
						<button
							onClick={() => setNewPaymentType("installment")}
							className={cn(
								"flex-1 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-headline font-bold border",
								newPaymentType === "installment"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-card text-on-surface-variant border-border",
							)}
						>
							Installments
						</button>
					</div>
					{newPaymentType === "installment" && (
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Down payment
								</label>
								<input
									type="number"
									value={downPayment}
									onChange={(e) => setDownPayment(e.target.value)}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
								/>
							</div>
							<div>
								<label className="block text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">
									Months
								</label>
								<input
									type="number"
									value={installmentMonths}
									onChange={(e) =>
										setInstallmentMonths(parseInt(e.target.value) || 12)
									}
									className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body"
								/>
							</div>
						</div>
					)}
					<textarea
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="Optional message to seller…"
						className="w-full bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body text-sm"
						rows={2}
					/>
					<button
						onClick={handleSubmitOffer}
						disabled={busyId === "__new__"}
						className="bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2.5 px-4 rounded-md shadow-lg transition-all disabled:opacity-50"
					>
						Submit offer
					</button>
				</div>
			)}

			{loading ? (
				<div className="text-on-surface-variant text-sm font-body">
					Loading offers…
				</div>
			) : visibleOffers.length === 0 ? (
				<div className="text-on-surface-variant text-sm font-body italic">
					No offers yet.
				</div>
			) : (
				<ul className="space-y-3">
					{visibleOffers.map((offer) => (
						<li
							key={offer.id}
							className="bg-surface-container rounded-md p-4 border border-border"
						>
							<div className="flex items-start justify-between gap-3 flex-wrap">
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-headline font-bold text-on-surface">
											{offer.buyerName}
										</span>
										<span
											className={cn(
												"text-badge uppercase tracking-widest px-2 py-0.5 rounded-md border font-headline font-bold",
												STATUS_BADGES[offer.status],
											)}
										>
											{offer.status}
										</span>
									</div>
									<div className="mt-1 flex items-center gap-1 text-on-surface-variant text-sm font-body">
										<DollarSign className="w-3.5 h-3.5" />
										{offer.currency}{" "}
										{offer.amount.toLocaleString(undefined, {
											maximumFractionDigits: 2,
										})}
										{offer.paymentType === "installment" && (
											<span className="text-xs ml-1 text-blue-500">
												· {offer.installmentPlan?.installmentCount}×
												installments
											</span>
										)}
									</div>
									{offer.counterAmount && (
										<div className="mt-1 text-xs text-blue-600 font-body">
											Countered at {offer.currency}{" "}
											{offer.counterAmount.toLocaleString()}
										</div>
									)}
									{offer.message && (
										<div className="mt-2 flex items-start gap-1 text-xs text-on-surface-variant font-body italic">
											<MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
											<span>{offer.message}</span>
										</div>
									)}
									{offer.createdAt && (
										<div className="mt-1 flex items-center gap-1 text-xs text-outline font-body">
											<Calendar className="w-3 h-3" />
											{new Date(offer.createdAt).toLocaleString()}
										</div>
									)}
								</div>

								<div className="flex flex-wrap gap-2">
									{isOwner &&
										(offer.status === OfferStatus.PENDING ||
											offer.status === OfferStatus.COUNTERED) && (
											<>
												<button
													onClick={() => handleAccept(offer.id)}
													disabled={busyId === offer.id}
													className="bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md flex items-center gap-1 disabled:opacity-50"
												>
													<Check className="w-3 h-3" /> Accept
												</button>
												<button
													onClick={() =>
														setCounterFor(
															counterFor === offer.id ? null : offer.id,
														)
													}
													className="bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md"
												>
													Counter
												</button>
												<button
													onClick={() => handleReject(offer.id)}
													disabled={busyId === offer.id}
													className="bg-rose-600 hover:bg-rose-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md flex items-center gap-1 disabled:opacity-50"
												>
													<X className="w-3 h-3" /> Reject
												</button>
											</>
										)}
									{!isOwner &&
										offer.buyerId === user?.id &&
										offer.status === OfferStatus.PENDING && (
											<button
												onClick={() => handleWithdraw(offer.id)}
												className="bg-on-surface-variant/20 hover:bg-on-surface-variant/30 text-on-surface font-headline font-bold text-xs uppercase tracking-widest py-1.5 px-3 rounded-md"
											>
												Withdraw
											</button>
										)}
								</div>
							</div>

							{counterFor === offer.id && (
								<div className="mt-3 flex gap-2">
									<input
										type="number"
										value={counterAmount}
										onChange={(e) => setCounterAmount(e.target.value)}
										placeholder="Counter amount"
										className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-on-surface font-body text-sm"
									/>
									<button
										onClick={() => handleCounter(offer.id)}
										className="bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2 px-3 rounded-md"
									>
										Send
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
