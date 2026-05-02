"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { ChatListSkeleton } from "@/components/ui/skeletons";
import { ChatAPI } from "@/lib/api";
import type { ChatSummary } from "@/types/chat";
import { MessageSquare, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatDistanceToNow(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({
	name,
	avatar,
	size = "md",
}: {
	name: string;
	avatar?: string;
	size?: "sm" | "md";
}) {
	const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
	if (avatar) {
		return (
			<Image
				src={avatar}
				alt={name}
				width={40}
				height={40}
				className={`${dim} rounded-full object-cover shrink-0`}
			/>
		);
	}
	return (
		<span
			className={`${dim} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0`}
		>
			{name.charAt(0).toUpperCase()}
		</span>
	);
}

function formatTime(iso: string) {
	try {
		return formatDistanceToNow(new Date(iso));
	} catch {
		return "";
	}
}

export default function ChatInboxPage() {
	const { user } = useAuth();
	const [chats, setChats] = useState<ChatSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	useEffect(() => {
		if (!user) return;
		ChatAPI.getChats().then((data) => {
			setChats(data);
			setLoading(false);
		});
	}, [user]);

	const filtered = chats.filter((c) => {
		const other = c.participants.find((p) => p.id !== user?.id);
		const name = other?.displayName ?? other?.name ?? "";
		const title = c.propertyTitle ?? "";
		return (
			name.toLowerCase().includes(search.toLowerCase()) ||
			title.toLowerCase().includes(search.toLowerCase())
		);
	});

	return (
		<AppShell>
			<div className="max-w-2xl w-full mx-auto px-4 py-8">
				<div className="flex items-center gap-3 mb-6">
					<MessageSquare className="w-5 h-5 text-primary" />
					<h1 className="text-xl font-headline font-bold text-on-surface">
						Messages
					</h1>
				</div>

				{/* Search */}
				<div className="relative mb-4">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
					<input
						type="text"
						placeholder="Search conversations…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-card text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				{loading ? (
					<ChatListSkeleton count={6} />
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center gap-3">
						<MessageSquare className="w-10 h-10 text-outline" />
						<p className="text-on-surface-variant font-medium">
							{search
								? "No conversations match your search."
								: "No messages yet."}
						</p>
						<p className="text-outline text-sm">
							Start a conversation from a property listing.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-1">
						{filtered.map((chat) => {
							const other = chat.participants.find((p) => p.id !== user?.id);
							const hasUnread = chat.unreadCount > 0;
							return (
								<Link
									key={chat.id}
									href={`/portfolio/chat/${chat.id}`}
									className="flex items-start gap-3 px-4 py-3 rounded-md hover:bg-surface-container transition-colors relative"
								>
									<Avatar
										name={other?.displayName ?? other?.name ?? "?"}
										avatar={other?.avatar}
									/>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<span
												className={`text-sm truncate ${hasUnread ? "font-bold text-on-surface" : "font-medium text-on-surface"}`}
											>
												{other?.displayName ?? other?.name ?? "Unknown"}
											</span>
											<span className="text-xs text-outline whitespace-nowrap shrink-0">
												{chat.lastMessageAt
													? formatTime(chat.lastMessageAt)
													: ""}
											</span>
										</div>
										{chat.propertyTitle && (
											<p className="text-xs text-outline truncate mb-0.5">
												Re: {chat.propertyTitle}
											</p>
										)}
										<p
											className={`text-xs truncate ${hasUnread ? "text-on-surface font-medium" : "text-on-surface-variant"}`}
										>
											{chat.lastMessage?.body ?? "No messages yet"}
										</p>
									</div>
									{hasUnread && (
										<span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
									)}
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</AppShell>
	);
}
