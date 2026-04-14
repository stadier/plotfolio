"use client";

import { useAuth } from "@/components/AuthContext";
import { BookingAPI } from "@/lib/api";
import { BookingType, Property } from "@/types/property";
import { Calendar, Clock, Loader2, MessageSquare, Tag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
	[BookingType.INSPECTION]: "Property Inspection",
	[BookingType.SITE_VISIT]: "Site Visit",
	[BookingType.CONSULTATION]: "Consultation",
	[BookingType.INQUIRY]: "Further Inquiry",
	[BookingType.VALUATION]: "Valuation Request",
	[BookingType.NEGOTIATION]: "Negotiation Meeting",
	[BookingType.OTHER]: "Other",
};

const BOOKING_TYPE_DESCRIPTIONS: Record<BookingType, string> = {
	[BookingType.INSPECTION]:
		"Physical walkthrough to assess the property condition",
	[BookingType.SITE_VISIT]:
		"On-site visit to view the property and surroundings",
	[BookingType.CONSULTATION]:
		"Discussion with the owner about terms, pricing, or details",
	[BookingType.INQUIRY]:
		"General questions or clarifications about the listing",
	[BookingType.VALUATION]:
		"Professional assessment of the property's market value",
	[BookingType.NEGOTIATION]:
		"Meeting to discuss and negotiate sale/lease terms",
	[BookingType.OTHER]: "Something else — please describe in the notes below",
};

interface BookingModalProps {
	open: boolean;
	onClose: () => void;
	property: Property;
	selectedDate: string; // YYYY-MM-DD
}

export default function BookingModal({
	open,
	onClose,
	property,
	selectedDate,
}: BookingModalProps) {
	const { user } = useAuth();
	const backdropRef = useRef<HTMLDivElement>(null);

	const [type, setType] = useState<BookingType>(BookingType.INSPECTION);
	const [time, setTime] = useState("10:00");
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<{
		ok: boolean;
		text: string;
	} | null>(null);

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			setType(BookingType.INSPECTION);
			setTime("10:00");
			setMessage("");
			setResult(null);
		}
	}, [open]);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);

	const handleSubmit = useCallback(async () => {
		if (!user || !property.owner) return;
		setSubmitting(true);
		setResult(null);

		const { error } = await BookingAPI.createBooking({
			ownerId: property.owner.id,
			requesterId: user.id,
			requesterName: user.name,
			requesterEmail: user.email,
			type,
			date: selectedDate,
			time,
			message: message.trim() || undefined,
			propertyId: property.id,
		});

		setSubmitting(false);
		if (error) {
			setResult({ ok: false, text: error });
		} else {
			setResult({
				ok: true,
				text: "Booking request sent! The owner will confirm shortly.",
			});
		}
	}, [user, property, type, selectedDate, time, message]);

	if (!open) return null;

	const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString(
		"en-US",
		{ weekday: "long", month: "long", day: "numeric", year: "numeric" },
	);

	return (
		<div
			ref={backdropRef}
			onClick={(e) => e.target === backdropRef.current && onClose()}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
		>
			<div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<h2 className="font-headline text-base font-semibold text-on-surface">
						Schedule a Visit
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-surface-container-high transition-colors"
					>
						<X className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>

				{/* Body */}
				<div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
					{/* Property & date summary */}
					<div className="flex flex-col gap-1 text-sm">
						<span className="font-medium text-on-surface">{property.name}</span>
						<span className="flex items-center gap-1.5 text-on-surface-variant">
							<Calendar className="w-3.5 h-3.5" />
							{displayDate}
						</span>
					</div>

					{/* Booking type */}
					<fieldset className="space-y-2">
						<legend className="flex items-center gap-1.5 text-sm font-semibold text-on-surface mb-1">
							<Tag className="w-3.5 h-3.5" />
							Nature of Visit
						</legend>
						<div className="grid gap-2">
							{Object.entries(BOOKING_TYPE_LABELS).map(([value, label]) => {
								const selected = type === value;
								return (
									<label
										key={value}
										className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
											selected
												? "border-primary bg-primary/5"
												: "border-border hover:border-primary/40"
										}`}
									>
										<input
											type="radio"
											name="bookingType"
											value={value}
											checked={selected}
											onChange={() => setType(value as BookingType)}
											className="mt-0.5 accent-primary"
										/>
										<div className="min-w-0">
											<span className="text-sm font-medium text-on-surface">
												{label}
											</span>
											<p className="text-xs text-on-surface-variant mt-0.5">
												{BOOKING_TYPE_DESCRIPTIONS[value as BookingType]}
											</p>
										</div>
									</label>
								);
							})}
						</div>
					</fieldset>

					{/* Preferred time */}
					<div className="space-y-1.5">
						<label
							htmlFor="booking-time"
							className="flex items-center gap-1.5 text-sm font-semibold text-on-surface"
						>
							<Clock className="w-3.5 h-3.5" />
							Preferred Time
						</label>
						<input
							id="booking-time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="w-full max-w-[10rem] border border-border rounded-lg px-3 py-2 text-sm text-on-surface bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>

					{/* Additional notes */}
					<div className="space-y-1.5">
						<label
							htmlFor="booking-message"
							className="flex items-center gap-1.5 text-sm font-semibold text-on-surface"
						>
							<MessageSquare className="w-3.5 h-3.5" />
							Additional Notes
							<span className="text-xs font-normal text-outline">
								(optional)
							</span>
						</label>
						<textarea
							id="booking-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
							maxLength={500}
							placeholder="Anything the owner should know — special requests, accessibility needs, topics to discuss…"
							className="w-full border border-border rounded-lg px-3 py-2 text-sm text-on-surface bg-card placeholder:text-outline resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
						<p className="text-xs text-outline text-right">
							{message.length}/500
						</p>
					</div>

					{/* Result feedback */}
					{result && (
						<div
							className={`text-sm rounded-lg px-3 py-2 ${
								result.ok
									? "bg-green-100 text-green-800 border border-green-200"
									: "bg-red-100 text-red-800 border border-red-200"
							}`}
						>
							{result.text}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
					<button
						type="button"
						onClick={onClose}
						disabled={submitting}
						className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
					>
						{result?.ok ? "Close" : "Cancel"}
					</button>
					{!result?.ok && (
						<button
							type="button"
							onClick={handleSubmit}
							disabled={submitting || !user}
							className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{submitting ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Calendar className="w-4 h-4" />
							)}
							{submitting ? "Sending…" : "Send Request"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
