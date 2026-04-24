"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { ChatAPI } from "@/lib/api";
import type { Chat, ChatMessage } from "@/types/chat";
import { ArrowLeft, Building2, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

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
	size = "sm",
}: {
	name: string;
	avatar?: string;
	size?: "sm" | "md";
}) {
	const dim = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
	if (avatar) {
		return (
			<Image
				src={avatar}
				alt={name}
				width={36}
				height={36}
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

function MessageBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
	return (
		<div
			className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
		>
			{!isMine && <Avatar name={msg.senderName} avatar={msg.senderAvatar} />}
			<div
				className={`max-w-[72%] rounded-md px-3 py-2 text-sm leading-relaxed ${
					isMine
						? "bg-blue-600 text-white rounded-br-none"
						: "bg-surface-container text-on-surface rounded-bl-none"
				}`}
			>
				{msg.body}
				<div
					className={`text-badge mt-1 ${isMine ? "text-blue-200 text-right" : "text-outline"}`}
				>
					{formatDistanceToNow(new Date(msg.createdAt))}
				</div>
			</div>
		</div>
	);
}

export default function ChatConversationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { user } = useAuth();
	const [chat, setChat] = useState<Chat | null>(null);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const fetchChat = async () => {
		const data = await ChatAPI.getChat(id);
		if (data) setChat(data);
		setLoading(false);
	};

	useEffect(() => {
		if (!user) return;
		fetchChat();
		// Poll for new messages every 5 seconds
		const interval = setInterval(async () => {
			const data = await ChatAPI.getChat(id);
			if (data) setChat(data);
		}, 5000);
		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, user]);

	// Scroll to bottom on new messages
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chat?.messages?.length]);

	const handleSend = async () => {
		const trimmed = message.trim();
		if (!trimmed || sending) return;

		setSending(true);
		setMessage("");
		const { error } = await ChatAPI.sendMessage(id, trimmed);
		setSending(false);

		if (!error) {
			await fetchChat();
		}
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const other = chat?.participants.find((p) => p.id !== user?.id);

	return (
		<AppShell scrollable={false}>
			<div className="flex flex-col h-full max-w-2xl w-full mx-auto">
				{/* Header */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
					<Link
						href="/portfolio/chat"
						className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
					>
						<ArrowLeft className="w-4 h-4" />
					</Link>
					{loading ? (
						<div className="h-5 w-32 bg-surface-container rounded animate-pulse" />
					) : (
						<>
							<Avatar
								name={other?.displayName ?? other?.name ?? "?"}
								avatar={other?.avatar}
								size="md"
							/>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-on-surface truncate">
									{other?.displayName ?? other?.name ?? "Unknown"}
								</p>
								{chat?.propertyTitle && (
									<div className="flex items-center gap-1 text-xs text-outline truncate">
										<Building2 className="w-3 h-3 shrink-0" />
										<span className="truncate">{chat.propertyTitle}</span>
									</div>
								)}
							</div>
							{chat?.propertyId && (
								<Link
									href={`/property/${chat.propertyId}`}
									className="text-xs text-blue-600 hover:underline shrink-0"
								>
									View property
								</Link>
							)}
						</>
					)}
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
					{loading ? (
						<div className="flex items-center justify-center h-full text-outline text-sm">
							Loading…
						</div>
					) : !chat || chat.messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-2 text-center">
							<p className="text-on-surface-variant text-sm">
								No messages yet. Say hello!
							</p>
						</div>
					) : (
						chat.messages.map((msg) => (
							<MessageBubble
								key={msg.id}
								msg={msg}
								isMine={msg.senderId === user?.id}
							/>
						))
					)}
					<div ref={bottomRef} />
				</div>

				{/* Input */}
				<div className="shrink-0 border-t border-border bg-card px-4 py-3 flex items-end gap-2">
					<textarea
						ref={inputRef}
						rows={1}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message…"
						className="flex-1 resize-none rounded-md border border-border bg-background text-sm text-on-surface placeholder:text-outline px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
						style={{ height: "auto", minHeight: "38px" }}
					/>
					<button
						onClick={handleSend}
						disabled={!message.trim() || sending}
						className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
					>
						<Send className="w-4 h-4" />
					</button>
				</div>
			</div>
		</AppShell>
	);
}
