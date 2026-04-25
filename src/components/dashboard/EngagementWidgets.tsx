"use client";

import { ChatAPI, TransferAPI } from "@/lib/api";
import type { ChatSummary } from "@/types/chat";
import {
	Booking,
	BookingStatus,
	OwnershipTransfer,
	TransferStatus,
} from "@/types/property";
import { CalendarCheck2, MessageCircle, MoveRight, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface EngagementWidgetsProps {
	userId: string;
	bookings: Booking[];
}

interface ItemCardProps {
	href: string;
	label: string;
	icon: React.ReactNode;
	primaryMetric: string;
	secondaryMetric: string;
	accentClass: string;
}

function ItemCard({
	href,
	label,
	icon,
	primaryMetric,
	secondaryMetric,
	accentClass,
}: ItemCardProps) {
	return (
		<Link
			href={href}
			className="bg-card border border-border rounded-md p-3 max-w-sm w-full hover:shadow-md transition-all card-hover"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="typo-caption text-outline uppercase tracking-widest font-semibold truncate">
						{label}
					</p>
					<p className="typo-body font-bold text-on-surface mt-1 truncate">
						{primaryMetric}
					</p>
					<p className="typo-caption text-on-surface-variant mt-0.5 truncate">
						{secondaryMetric}
					</p>
				</div>
				<div
					className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${accentClass}`}
				>
					{icon}
				</div>
			</div>
		</Link>
	);
}

export default function EngagementWidgets({
	userId,
	bookings,
}: EngagementWidgetsProps) {
	const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
	const [chats, setChats] = useState<ChatSummary[]>([]);
	const [loadingRemote, setLoadingRemote] = useState(true);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setLoadingRemote(true);
			const [transferData, chatData] = await Promise.all([
				TransferAPI.getMyTransfers(userId),
				ChatAPI.getChats(),
			]);
			if (cancelled) return;
			setTransfers(transferData);
			setChats(chatData);
			setLoadingRemote(false);
		};

		load();

		return () => {
			cancelled = true;
		};
	}, [userId]);

	const todayStr = new Date().toISOString().slice(0, 10);

	const bookingMetrics = useMemo(() => {
		const pending = bookings.filter(
			(b) =>
				b.status === BookingStatus.PENDING ||
				b.status === BookingStatus.RESCHEDULED,
		).length;
		const upcoming = bookings.filter(
			(b) => b.status !== BookingStatus.CANCELLED && b.date >= todayStr,
		).length;
		return { pending, upcoming };
	}, [bookings, todayStr]);

	const transferMetrics = useMemo(() => {
		const incomingPending = transfers.filter(
			(t) => t.toUserId === userId && t.status === TransferStatus.PENDING,
		).length;
		const completed = transfers.filter(
			(t) => t.status === TransferStatus.COMPLETED,
		).length;
		return { incomingPending, completed };
	}, [transfers, userId]);

	const chatMetrics = useMemo(() => {
		const unread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
		return { unread, conversations: chats.length };
	}, [chats]);

	return (
		<div className="bg-card sz-card border border-border max-w-xl widget-card animate-fade-in-up">
			<div className="flex items-center justify-between gap-2 mb-3">
				<h3 className="typo-section-title font-bold text-on-surface">
					Engagement Hub
				</h3>
				<span className="typo-caption text-outline">
					{loadingRemote ? "Syncing" : "Live"}
				</span>
			</div>

			<div className="flex flex-wrap items-start gap-3">
				<ItemCard
					href="/portfolio/bookings"
					label="Bookings"
					icon={<CalendarCheck2 className="w-4 h-4 text-emerald-700" />}
					primaryMetric={`${bookingMetrics.pending} pending`}
					secondaryMetric={`${bookingMetrics.upcoming} upcoming`}
					accentClass="bg-emerald-100"
				/>
				<ItemCard
					href="/portfolio/transfers"
					label="Transfers"
					icon={<Send className="w-4 h-4 text-blue-700" />}
					primaryMetric={`${transferMetrics.incomingPending} incoming pending`}
					secondaryMetric={`${transferMetrics.completed} completed`}
					accentClass="bg-blue-100"
				/>
				<ItemCard
					href="/portfolio/chat"
					label="Chat"
					icon={<MessageCircle className="w-4 h-4 text-amber-700" />}
					primaryMetric={`${chatMetrics.unread} unread`}
					secondaryMetric={`${chatMetrics.conversations} conversations`}
					accentClass="bg-amber-100"
				/>
				<ItemCard
					href="/portfolio/properties"
					label="Portfolio"
					icon={<MoveRight className="w-4 h-4 text-violet-700" />}
					primaryMetric="Open properties"
					secondaryMetric="View assets and updates"
					accentClass="bg-violet-100"
				/>
			</div>
		</div>
	);
}
