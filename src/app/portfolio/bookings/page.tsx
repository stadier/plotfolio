"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { BookingAPI } from "@/lib/api";
import { Booking, BookingStatus, BookingType } from "@/types/property";
import {
	Calendar,
	Check,
	Clock,
	Home,
	Loader2,
	MessageSquare,
	RefreshCw,
	RotateCcw,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ─── Labels ──────────────────────────────────────────────────── */

const TYPE_LABELS: Record<BookingType, string> = {
	[BookingType.INSPECTION]: "Inspection",
	[BookingType.SITE_VISIT]: "Site Visit",
	[BookingType.CONSULTATION]: "Consultation",
	[BookingType.INQUIRY]: "Inquiry",
	[BookingType.VALUATION]: "Valuation",
	[BookingType.NEGOTIATION]: "Negotiation",
	[BookingType.OTHER]: "Other",
};

const STATUS_STYLES: Record<
	BookingStatus,
	{ bg: string; text: string; label: string }
> = {
	[BookingStatus.PENDING]: {
		bg: "bg-yellow-100",
		text: "text-yellow-800",
		label: "Pending",
	},
	[BookingStatus.CONFIRMED]: {
		bg: "bg-green-100",
		text: "text-green-800",
		label: "Confirmed",
	},
	[BookingStatus.CANCELLED]: {
		bg: "bg-red-100",
		text: "text-red-800",
		label: "Declined",
	},
	[BookingStatus.COMPLETED]: {
		bg: "bg-blue-100",
		text: "text-blue-800",
		label: "Completed",
	},
	[BookingStatus.RESCHEDULED]: {
		bg: "bg-purple-100",
		text: "text-purple-800",
		label: "Rescheduled",
	},
};

/* ─── Reschedule Modal ────────────────────────────────────────── */

function RescheduleModal({
	open,
	onClose,
	onSubmit,
	submitting,
}: {
	open: boolean;
	onClose: () => void;
	onSubmit: (date: string, time: string, message: string) => void;
	submitting: boolean;
}) {
	const [date, setDate] = useState("");
	const [time, setTime] = useState("10:00");
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (open) {
			setDate("");
			setTime("10:00");
			setMessage("");
		}
	}, [open]);

	if (!open) return null;

	return (
		<div
			onClick={(e) => e.target === e.currentTarget && onClose()}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
		>
			<div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<h2 className="font-headline text-base font-semibold text-on-surface">
						Propose Reschedule
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-surface-container-high transition-colors"
					>
						<X className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>
				<div className="px-5 py-4 space-y-4">
					<div className="space-y-1.5">
						<label
							htmlFor="reschedule-date"
							className="text-sm font-semibold text-on-surface"
						>
							Proposed Date
						</label>
						<input
							id="reschedule-date"
							type="date"
							value={date}
							min={new Date().toISOString().split("T")[0]}
							onChange={(e) => setDate(e.target.value)}
							className="w-full border border-border rounded-lg px-3 py-2 text-sm text-on-surface bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
					<div className="space-y-1.5">
						<label
							htmlFor="reschedule-time"
							className="text-sm font-semibold text-on-surface"
						>
							Proposed Time
						</label>
						<input
							id="reschedule-time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="w-full max-w-[10rem] border border-border rounded-lg px-3 py-2 text-sm text-on-surface bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
					<div className="space-y-1.5">
						<label
							htmlFor="reschedule-message"
							className="text-sm font-semibold text-on-surface"
						>
							Message{" "}
							<span className="text-xs font-normal text-outline">
								(optional)
							</span>
						</label>
						<textarea
							id="reschedule-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={2}
							maxLength={300}
							placeholder="Let them know why you're suggesting a different time…"
							className="w-full border border-border rounded-lg px-3 py-2 text-sm text-on-surface bg-card placeholder:text-outline resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
				</div>
				<div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
					<button
						type="button"
						onClick={onClose}
						disabled={submitting}
						className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={!date || submitting}
						onClick={() => onSubmit(date, time, message.trim())}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						{submitting ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<RotateCcw className="w-4 h-4" />
						)}
						{submitting ? "Sending…" : "Send Proposal"}
					</button>
				</div>
			</div>
		</div>
	);
}

/* ─── Booking Card ────────────────────────────────────────────── */

function BookingCard({
	booking,
	onAction,
	acting,
	viewMode,
}: {
	booking: Booking;
	onAction: (
		id: string,
		action: "confirm" | "decline" | "reschedule" | "cancel",
		extra?: {
			proposedDate: string;
			proposedTime: string;
			ownerMessage: string;
		},
	) => void;
	acting: string | null;
	viewMode: "incoming" | "outgoing";
}) {
	const [rescheduleOpen, setRescheduleOpen] = useState(false);
	const style =
		STATUS_STYLES[booking.status] ?? STATUS_STYLES[BookingStatus.PENDING];
	const isPending = booking.status === BookingStatus.PENDING;
	const isActing = acting === booking.id;
	const isOutgoing = viewMode === "outgoing";

	const displayDate = new Date(booking.date + "T00:00:00").toLocaleDateString(
		"en-US",
		{ weekday: "short", month: "short", day: "numeric", year: "numeric" },
	);

	return (
		<div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-xl">
			{/* Header: type + status */}
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-semibold text-on-surface">
					{TYPE_LABELS[booking.type] ?? booking.type}
				</span>
				<span
					className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
				>
					{style.label}
				</span>
			</div>

			{/* Property (link to listing) */}
			{booking.property && (
				<Link
					href={`/property/${booking.property.id}`}
					className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
				>
					<Home className="w-3.5 h-3.5 shrink-0" />
					<span className="font-medium text-on-surface truncate">
						{booking.property.name}
					</span>
				</Link>
			)}

			{/* Counterparty: requester (incoming) or owner (outgoing) */}
			<div className="flex items-center gap-2 text-sm text-on-surface-variant">
				<User className="w-3.5 h-3.5 shrink-0" />
				{isOutgoing ? (
					<>
						<span className="text-outline">Owner:</span>
						<span className="font-medium text-on-surface">
							{booking.ownerInfo?.name || "Unknown"}
						</span>
						{booking.ownerInfo?.email && (
							<span className="text-outline truncate">
								({booking.ownerInfo.email})
							</span>
						)}
					</>
				) : (
					<>
						<span className="font-medium text-on-surface">
							{booking.requesterName}
						</span>
						<span className="text-outline">({booking.requesterEmail})</span>
					</>
				)}
			</div>

			{/* Date & time */}
			<div className="flex items-center gap-4 text-sm text-on-surface-variant">
				<span className="inline-flex items-center gap-1.5">
					<Calendar className="w-3.5 h-3.5" />
					{displayDate}
				</span>
				<span className="inline-flex items-center gap-1.5">
					<Clock className="w-3.5 h-3.5" />
					{booking.time}
				</span>
			</div>

			{/* Message from requester */}
			{booking.message && (
				<div className="flex items-start gap-2 text-sm">
					<MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-on-surface-variant" />
					<p className="text-on-surface-variant">{booking.message}</p>
				</div>
			)}

			{/* Reschedule proposal shown */}
			{booking.status === BookingStatus.RESCHEDULED && booking.proposedDate && (
				<div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm space-y-1">
					<p className="font-medium text-purple-800">
						{isOutgoing ? "Owner proposed:" : "You proposed:"}{" "}
						{new Date(booking.proposedDate + "T00:00:00").toLocaleDateString(
							"en-US",
							{
								weekday: "short",
								month: "short",
								day: "numeric",
							},
						)}{" "}
						at {booking.proposedTime}
					</p>
					{booking.ownerMessage && (
						<p className="text-purple-700">{booking.ownerMessage}</p>
					)}
				</div>
			)}

			{/* Actions for pending bookings — owner side */}
			{isPending && !isOutgoing && (
				<div className="flex items-center gap-2 pt-1">
					<button
						type="button"
						disabled={isActing}
						onClick={() => onAction(booking.id, "confirm")}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
					>
						{isActing ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<Check className="w-3.5 h-3.5" />
						)}
						Confirm
					</button>
					<button
						type="button"
						disabled={isActing}
						onClick={() => setRescheduleOpen(true)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						Reschedule
					</button>
					<button
						type="button"
						disabled={isActing}
						onClick={() => onAction(booking.id, "decline")}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
					>
						<X className="w-3.5 h-3.5" />
						Decline
					</button>
				</div>
			)}

			{/* Actions for pending bookings — requester (outgoing) side */}
			{isPending && isOutgoing && (
				<div className="flex items-center gap-2 pt-1">
					<button
						type="button"
						disabled={isActing}
						onClick={() => onAction(booking.id, "cancel")}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
					>
						{isActing ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<X className="w-3.5 h-3.5" />
						)}
						Cancel Request
					</button>
				</div>
			)}

			{/* Timestamp */}
			{booking.createdAt && (
				<p className="text-xs text-outline">
					Requested{" "}
					{new Date(booking.createdAt).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
						hour: "numeric",
						minute: "2-digit",
					})}
				</p>
			)}

			<RescheduleModal
				open={rescheduleOpen}
				onClose={() => setRescheduleOpen(false)}
				submitting={isActing}
				onSubmit={(date, time, message) => {
					onAction(booking.id, "reschedule", {
						proposedDate: date,
						proposedTime: time,
						ownerMessage: message,
					});
					setRescheduleOpen(false);
				}}
			/>
		</div>
	);
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function BookingsPage() {
	const { user } = useAuth();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [acting, setActing] = useState<string | null>(null);
	const [scope, setScope] = useState<"incoming" | "outgoing">("incoming");
	const [filter, setFilter] = useState<
		"all" | "pending" | "confirmed" | "past"
	>("all");

	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(
		async (opts?: { force?: boolean; silent?: boolean }) => {
			if (!user) return;
			if (opts?.silent) {
				setRefreshing(true);
			} else {
				setLoading(true);
			}
			const params =
				scope === "incoming" ? { ownerId: user.id } : { requesterId: user.id };
			const data = await BookingAPI.getBookings({
				...params,
				force: opts?.force,
			});
			setBookings(data);
			setLoading(false);
			setRefreshing(false);
		},
		[user, scope],
	);

	useEffect(() => {
		load();
	}, [load]);

	const handleAction = useCallback(
		async (
			id: string,
			action: "confirm" | "decline" | "reschedule" | "cancel",
			extra?: {
				proposedDate: string;
				proposedTime: string;
				ownerMessage: string;
			},
		) => {
			setActing(id);
			const statusMap = {
				confirm: BookingStatus.CONFIRMED,
				decline: BookingStatus.CANCELLED,
				reschedule: BookingStatus.RESCHEDULED,
				cancel: BookingStatus.CANCELLED,
			};
			const update: Parameters<typeof BookingAPI.updateBooking>[1] = {
				status: statusMap[action],
				initiatedBy: action === "cancel" ? "requester" : "owner",
			};
			if (action === "reschedule" && extra) {
				update.proposedDate = extra.proposedDate;
				update.proposedTime = extra.proposedTime;
				update.ownerMessage = extra.ownerMessage;
			}
			const { booking } = await BookingAPI.updateBooking(id, update);
			if (booking) {
				setBookings((prev) => prev.map((b) => (b.id === id ? booking : b)));
			}
			setActing(null);
		},
		[],
	);

	const filtered = bookings.filter((b) => {
		if (filter === "pending") return b.status === BookingStatus.PENDING;
		if (filter === "confirmed") return b.status === BookingStatus.CONFIRMED;
		if (filter === "past")
			return (
				b.status === BookingStatus.CANCELLED ||
				b.status === BookingStatus.COMPLETED ||
				b.status === BookingStatus.RESCHEDULED
			);
		return true;
	});

	const pendingCount = bookings.filter(
		(b) => b.status === BookingStatus.PENDING,
	).length;

	const tabs = [
		{ key: "all" as const, label: "All", count: bookings.length },
		{ key: "pending" as const, label: "Pending", count: pendingCount },
		{
			key: "confirmed" as const,
			label: "Confirmed",
			count: bookings.filter((b) => b.status === BookingStatus.CONFIRMED)
				.length,
		},
		{ key: "past" as const, label: "Past", count: undefined },
	];

	return (
		<AppShell>
			<div className="sz-page max-w-3xl">
				{/* Header */}
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold font-headline text-on-surface">
							Bookings
						</h1>
						<p className="text-sm text-on-surface-variant mt-1">
							{scope === "incoming"
								? "Manage visit and consultation requests from interested buyers"
								: "Track the bookings you've requested on other people's properties"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => load({ force: true, silent: true })}
						disabled={refreshing || loading}
						title="Refresh bookings"
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-border text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
					>
						<RefreshCw
							className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
						/>
						Refresh
					</button>
				</div>

				{/* Scope toggle: incoming (as owner) vs outgoing (as requester) */}
				<div className="inline-flex p-1 mb-6 rounded-md bg-surface-container-high">
					{(
						[
							{ key: "incoming", label: "Received" },
							{ key: "outgoing", label: "My Requests" },
						] as const
					).map((s) => (
						<button
							key={s.key}
							type="button"
							onClick={() => {
								setScope(s.key);
								setFilter("all");
							}}
							className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
								scope === s.key
									? "bg-card text-on-surface shadow-sm"
									: "text-on-surface-variant hover:text-on-surface"
							}`}
						>
							{s.label}
						</button>
					))}
				</div>

				{/* Tabs */}
				<div className="flex gap-1 mb-6 border-b border-border">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => setFilter(tab.key)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
								filter === tab.key
									? "border-primary text-primary"
									: "border-transparent text-on-surface-variant hover:text-on-surface"
							}`}
						>
							{tab.label}
							{tab.count != null && tab.count > 0 && (
								<span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-surface-container-high">
									{tab.count}
								</span>
							)}
						</button>
					))}
				</div>

				{/* Content */}
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<Calendar className="w-10 h-10 text-outline mb-3" />
						<p className="text-sm text-on-surface-variant">
							{scope === "outgoing"
								? filter === "pending"
									? "No pending requests you've sent"
									: filter === "confirmed"
										? "No confirmed requests you've sent"
										: "You haven't requested any bookings yet"
								: filter === "pending"
									? "No pending requests"
									: filter === "confirmed"
										? "No confirmed bookings"
										: "No booking requests yet"}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filtered.map((booking) => (
							<BookingCard
								key={booking.id}
								booking={booking}
								onAction={handleAction}
								acting={acting}
								viewMode={scope}
							/>
						))}
					</div>
				)}
			</div>
		</AppShell>
	);
}
