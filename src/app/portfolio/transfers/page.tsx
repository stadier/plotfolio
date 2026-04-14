"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import UserAvatar from "@/components/ui/UserAvatar";
import { TransferAPI } from "@/lib/api";
import { OwnershipTransfer, TransferStatus } from "@/types/property";
import { ArrowRight, Check, Inbox, Loader2, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ─── Status styling ──────────────────────────────────────────── */

const STATUS_STYLES: Record<
	TransferStatus,
	{ bg: string; text: string; label: string }
> = {
	[TransferStatus.PENDING]: {
		bg: "bg-amber-100",
		text: "text-amber-800",
		label: "Pending",
	},
	[TransferStatus.ACCEPTED]: {
		bg: "bg-blue-100",
		text: "text-blue-800",
		label: "Accepted",
	},
	[TransferStatus.COMPLETED]: {
		bg: "bg-emerald-100",
		text: "text-emerald-800",
		label: "Completed",
	},
	[TransferStatus.REJECTED]: {
		bg: "bg-red-100",
		text: "text-red-800",
		label: "Rejected",
	},
	[TransferStatus.CANCELLED]: {
		bg: "bg-gray-100",
		text: "text-gray-600",
		label: "Cancelled",
	},
};

type Tab = "all" | "incoming" | "outgoing" | "pending";

/* ─── Transfer Card ───────────────────────────────────────────── */

function TransferCard({
	transfer,
	userId,
	onAction,
}: {
	transfer: OwnershipTransfer;
	userId: string;
	onAction: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [showRejectInput, setShowRejectInput] = useState(false);
	const [rejectMsg, setRejectMsg] = useState("");

	const isSender = transfer.fromUserId === userId;
	const isRecipient = transfer.toUserId === userId;
	const isPending = transfer.status === TransferStatus.PENDING;
	const ss =
		STATUS_STYLES[transfer.status] || STATUS_STYLES[TransferStatus.PENDING];

	const handleAction = async (action: "accept" | "reject" | "cancel") => {
		setLoading(true);
		await TransferAPI.respondToTransfer(transfer.propertyId, {
			transferId: transfer.id,
			action,
			userId,
			responseMessage: action === "reject" ? rejectMsg || undefined : undefined,
		});
		setLoading(false);
		setShowRejectInput(false);
		onAction();
	};

	return (
		<div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-xl">
			{/* Direction label */}
			<div className="flex items-center justify-between gap-2">
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full ${
						isRecipient
							? "bg-blue-50 text-blue-700"
							: "bg-orange-50 text-orange-700"
					}`}
				>
					{isRecipient ? "Incoming" : "Outgoing"}
				</span>
				<span
					className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ss.bg} ${ss.text}`}
				>
					{ss.label}
				</span>
			</div>

			{/* Property name */}
			<Link
				href={`/portfolio/properties/${transfer.propertyId}`}
				className="text-sm font-semibold text-primary hover:underline block truncate"
			>
				{transfer.propertyName}
			</Link>

			{/* From → To */}
			<div className="flex items-center gap-2">
				<UserAvatar
					name={transfer.fromName}
					avatar={transfer.fromAvatar}
					size="sm"
				/>
				<span className="text-xs text-on-surface-variant truncate">
					{transfer.fromName}
				</span>
				<ArrowRight className="w-4 h-4 text-outline shrink-0" />
				<UserAvatar
					name={transfer.toName}
					avatar={transfer.toAvatar}
					size="sm"
				/>
				<span className="text-xs text-on-surface-variant truncate">
					{transfer.toName}
				</span>
			</div>

			{/* Details */}
			{transfer.price ? (
				<p className="text-xs text-on-surface-variant">
					Price:{" "}
					<span className="font-medium text-on-surface">
						{transfer.price.toLocaleString()}
					</span>
				</p>
			) : null}

			{transfer.message && (
				<p className="text-xs text-on-surface-variant italic">
					&ldquo;{transfer.message}&rdquo;
				</p>
			)}

			{transfer.responseMessage && (
				<p className="text-xs text-on-surface-variant">
					Response: &ldquo;{transfer.responseMessage}&rdquo;
				</p>
			)}

			<p className="text-xs text-outline">
				{transfer.createdAt &&
					new Date(transfer.createdAt).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
			</p>

			{/* Actions for pending transfers */}
			{isPending && (
				<div className="flex flex-wrap gap-2 pt-1 border-t border-border">
					{isRecipient && !showRejectInput && (
						<>
							<button
								type="button"
								disabled={loading}
								onClick={() => handleAction("accept")}
								className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
							>
								<Check className="w-3.5 h-3.5" /> Accept Transfer
							</button>
							<button
								type="button"
								disabled={loading}
								onClick={() => setShowRejectInput(true)}
								className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
							>
								<X className="w-3.5 h-3.5" /> Reject
							</button>
						</>
					)}
					{isRecipient && showRejectInput && (
						<div className="flex flex-col gap-2 w-full">
							<input
								value={rejectMsg}
								onChange={(e) => setRejectMsg(e.target.value)}
								placeholder="Reason for rejection (optional)"
								className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-on-surface text-xs"
							/>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={loading}
									onClick={() => handleAction("reject")}
									className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
								>
									Confirm Reject
								</button>
								<button
									type="button"
									onClick={() => setShowRejectInput(false)}
									className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
								>
									Back
								</button>
							</div>
						</div>
					)}
					{isSender && (
						<button
							type="button"
							disabled={loading}
							onClick={() => handleAction("cancel")}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
						>
							<X className="w-3.5 h-3.5" /> Cancel Transfer
						</button>
					)}
				</div>
			)}
		</div>
	);
}

/* ─── Main Page ───────────────────────────────────────────────── */

export default function TransfersPage() {
	const { user } = useAuth();
	const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<Tab>("all");

	const load = useCallback(async () => {
		if (!user) return;
		setLoading(true);
		const data = await TransferAPI.getMyTransfers(user.id);
		setTransfers(data);
		setLoading(false);
	}, [user]);

	useEffect(() => {
		load();
	}, [load]);

	const filtered = transfers.filter((t) => {
		if (tab === "incoming") return t.toUserId === user?.id;
		if (tab === "outgoing") return t.fromUserId === user?.id;
		if (tab === "pending") return t.status === TransferStatus.PENDING;
		return true;
	});

	const pendingIncoming = transfers.filter(
		(t) => t.toUserId === user?.id && t.status === TransferStatus.PENDING,
	).length;

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: "all", label: "All" },
		{ key: "incoming", label: "Incoming" },
		{ key: "outgoing", label: "Outgoing" },
		{ key: "pending", label: "Pending", count: pendingIncoming },
	];

	return (
		<AppShell>
			<div className="sz-page max-w-3xl">
				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					<Send className="w-6 h-6 text-primary" />
					<div>
						<h1 className="font-headline text-lg font-semibold text-on-surface">
							Transfers
						</h1>
						<p className="text-sm text-on-surface-variant">
							Ownership transfers sent to or received by you
						</p>
					</div>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 mb-6 overflow-x-auto">
					{tabs.map((t) => (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
								tab === t.key
									? "bg-primary text-white"
									: "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
							}`}
						>
							{t.label}
							{t.count ? (
								<span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
									{t.count}
								</span>
							) : null}
						</button>
					))}
				</div>

				{/* Content */}
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="w-5 h-5 text-outline animate-spin" />
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
						<Inbox className="w-10 h-10 text-outline" />
						<p className="text-sm text-on-surface-variant">
							{tab === "incoming"
								? "No incoming transfers"
								: tab === "outgoing"
									? "No outgoing transfers"
									: tab === "pending"
										? "No pending transfers"
										: "No transfers yet"}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{filtered.map((t) => (
							<TransferCard
								key={t.id}
								transfer={t}
								userId={user?.id || ""}
								onAction={load}
							/>
						))}
					</div>
				)}
			</div>
		</AppShell>
	);
}
