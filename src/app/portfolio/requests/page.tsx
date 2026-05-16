"use client";

import { useAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PropertyAPI } from "@/lib/api";
import { AccessRequestStatus, DocumentAccessRequest } from "@/types/property";
import { Check, FileText, Inbox, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "pending" | "all" | "approved" | "denied";

const STATUS_META: Record<
	AccessRequestStatus,
	{ label: string; badgeClass: string }
> = {
	[AccessRequestStatus.PENDING]: {
		label: "Pending",
		badgeClass: "bg-amber-100 text-amber-800",
	},
	[AccessRequestStatus.APPROVED]: {
		label: "Approved",
		badgeClass: "bg-emerald-100 text-emerald-800",
	},
	[AccessRequestStatus.DENIED]: {
		label: "Denied",
		badgeClass: "bg-rose-100 text-rose-700",
	},
};

function RequestRow({
	request,
	ownerId,
	onResolved,
}: {
	request: DocumentAccessRequest;
	ownerId: string;
	onResolved: (requestId: string, status: AccessRequestStatus) => void;
}) {
	const [responding, setResponding] = useState<AccessRequestStatus | null>(
		null,
	);
	const statusMeta = STATUS_META[request.status];

	async function respond(
		status: AccessRequestStatus.APPROVED | AccessRequestStatus.DENIED,
	) {
		setResponding(status);
		const updated = await PropertyAPI.respondToAccessRequest(
			request.propertyId,
			{
				requestId: request.id,
				ownerId,
				status,
			},
		);
		if (updated) onResolved(request.id, status);
		setResponding(null);
	}

	return (
		<div className="bg-card border border-border rounded-md p-4 w-full max-w-2xl">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-on-surface truncate">
						{request.requesterName}
					</p>
					<p className="text-xs text-on-surface-variant truncate">
						{request.requesterEmail}
					</p>
				</div>
				<span
					className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.badgeClass}`}
				>
					{statusMeta.label}
				</span>
			</div>

			<div className="mt-3 flex flex-col gap-1 text-xs text-on-surface-variant">
				<p>
					Property:{" "}
					<span className="text-on-surface">{request.propertyId}</span>
				</p>
				<p>
					Document:{" "}
					<span className="text-on-surface">{request.documentId}</span>
				</p>
				<p>Requested: {new Date(request.createdAt).toLocaleString()}</p>
			</div>

			{request.message ? (
				<div className="mt-3 rounded-md bg-surface-container px-3 py-2 text-xs italic text-on-surface-variant">
					&ldquo;{request.message}&rdquo;
				</div>
			) : null}

			<div className="mt-4 flex flex-wrap items-center gap-2">
				<Link
					href={`/portfolio/properties/${request.propertyId}`}
					className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
				>
					<FileText className="w-3.5 h-3.5" />
					Open Property
				</Link>

				{request.status === AccessRequestStatus.PENDING ? (
					<>
						<PrimaryButton
							onClick={() => respond(AccessRequestStatus.APPROVED)}
							disabled={responding !== null}
							className="py-2 px-3 text-[11px]"
						>
							{responding === AccessRequestStatus.APPROVED ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Check className="w-3.5 h-3.5" />
							)}
							Approve
						</PrimaryButton>
						<button
							type="button"
							onClick={() => respond(AccessRequestStatus.DENIED)}
							disabled={responding !== null}
							className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-rose-300 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
						>
							{responding === AccessRequestStatus.DENIED ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<X className="w-3.5 h-3.5" />
							)}
							Deny
						</button>
					</>
				) : null}
			</div>
		</div>
	);
}

export default function RequestsPage() {
	const { user } = useAuth();
	const [requests, setRequests] = useState<DocumentAccessRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<Tab>("pending");

	const loadRequests = useCallback(async () => {
		if (!user?.id) {
			setRequests([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		const rows = await PropertyAPI.getAllAccessRequestsForOwner(user.id);
		setRequests(rows);
		setLoading(false);
	}, [user?.id]);

	useEffect(() => {
		loadRequests();
	}, [loadRequests]);

	const counts = useMemo(() => {
		const pending = requests.filter(
			(r) => r.status === AccessRequestStatus.PENDING,
		).length;
		const approved = requests.filter(
			(r) => r.status === AccessRequestStatus.APPROVED,
		).length;
		const denied = requests.filter(
			(r) => r.status === AccessRequestStatus.DENIED,
		).length;
		return { pending, approved, denied, all: requests.length };
	}, [requests]);

	const filtered = requests.filter((request) => {
		if (tab === "all") return true;
		if (tab === "pending")
			return request.status === AccessRequestStatus.PENDING;
		if (tab === "approved")
			return request.status === AccessRequestStatus.APPROVED;
		return request.status === AccessRequestStatus.DENIED;
	});

	const tabs: { key: Tab; label: string; count: number }[] = [
		{ key: "pending", label: "Pending", count: counts.pending },
		{ key: "all", label: "All", count: counts.all },
		{ key: "approved", label: "Approved", count: counts.approved },
		{ key: "denied", label: "Denied", count: counts.denied },
	];

	function handleResolved(requestId: string, status: AccessRequestStatus) {
		setRequests((prev) =>
			prev.map((request) =>
				request.id === requestId
					? {
							...request,
							status,
							updatedAt: new Date().toISOString(),
						}
					: request,
			),
		);
	}

	return (
		<AppShell>
			<div className="sz-page max-w-3xl">
				<div className="flex items-center gap-3 mb-6">
					<Inbox className="w-6 h-6 text-primary" />
					<div>
						<h1 className="font-headline text-lg font-semibold text-on-surface">
							Requests
						</h1>
						<p className="text-sm text-on-surface-variant">
							Review and respond to document access requests
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-1 mb-5">
					{tabs.map((item) => (
						<button
							key={item.key}
							type="button"
							onClick={() => setTab(item.key)}
							className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
								tab === item.key
									? "bg-primary text-white"
									: "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
							}`}
						>
							{item.label}
							<span className="ml-1.5 text-[11px]">{item.count}</span>
						</button>
					))}
				</div>

				{loading ? (
					<div className="py-16 flex items-center justify-center">
						<Loader2 className="w-5 h-5 animate-spin text-outline" />
					</div>
				) : filtered.length === 0 ? (
					<div className="w-full max-w-2xl bg-card border border-border rounded-md p-6 text-center">
						<Inbox className="w-8 h-8 text-outline mx-auto mb-2" />
						<p className="text-sm text-on-surface-variant">
							No {tab} requests right now.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filtered.map((request) => (
							<RequestRow
								key={request.id}
								request={request}
								ownerId={user?.id ?? ""}
								onResolved={handleResolved}
							/>
						))}
					</div>
				)}
			</div>
		</AppShell>
	);
}
