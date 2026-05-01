"use client";

import { PropertyAPI } from "@/lib/api";
import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentAccessRequest,
	PropertyDocument,
} from "@/types/property";
import {
	Check,
	Clock,
	Eye,
	EyeOff,
	FileText,
	Lock,
	Send,
	Shield,
	ShieldCheck,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ─── Access level selector (owner side) ─────────────────────── */

const ACCESS_LEVELS = [
	{
		value: DocumentAccessLevel.PUBLIC,
		label: "Public",
		desc: "Anyone can view",
		icon: Eye,
		color: "text-green-600",
	},
	{
		value: DocumentAccessLevel.REQUEST_REQUIRED,
		label: "Request Required",
		desc: "Others must request access",
		icon: Shield,
		color: "text-amber-600",
	},
	{
		value: DocumentAccessLevel.PRIVATE,
		label: "Private",
		desc: "Only you can view",
		icon: EyeOff,
		color: "text-red-600",
	},
];

export function DocumentAccessLevelBadge({
	accessLevel,
}: {
	accessLevel: DocumentAccessLevel;
}) {
	const level = ACCESS_LEVELS.find((l) => l.value === accessLevel);
	if (!level) return null;
	const Icon = level.icon;

	const colors: Record<DocumentAccessLevel, string> = {
		[DocumentAccessLevel.PUBLIC]: "bg-green-50 text-green-700 border-green-200",
		[DocumentAccessLevel.REQUEST_REQUIRED]:
			"bg-amber-50 text-amber-700 border-amber-200",
		[DocumentAccessLevel.PRIVATE]: "bg-red-50 text-red-700 border-red-200",
	};

	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full typo-badge font-medium border ${colors[accessLevel]}`}
		>
			<Icon className="w-3 h-3" />
			{level.label}
		</span>
	);
}

export function DocumentAccessLevelPicker({
	docId,
	propertyId,
	currentLevel,
	onChanged,
}: {
	docId: string;
	propertyId: string;
	currentLevel: DocumentAccessLevel;
	onChanged: (docId: string, level: DocumentAccessLevel) => void;
}) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	async function handleSelect(level: DocumentAccessLevel) {
		if (level === currentLevel) {
			setOpen(false);
			return;
		}
		setSaving(true);
		const ok = await PropertyAPI.updateDocumentAccessLevel(
			propertyId,
			docId,
			level,
		);
		if (ok) {
			onChanged(docId, level);
		}
		setSaving(false);
		setOpen(false);
	}

	return (
		<div className="relative">
			<button
				onClick={() => setOpen(!open)}
				disabled={saving}
				className="p-1.5 hover:bg-gray-100 dark:hover:bg-surface-container rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-on-surface-variant transition-colors disabled:opacity-50"
				title="Set access level"
			>
				{saving ? (
					<Lock className="w-4 h-4 animate-pulse" />
				) : (
					<Lock className="w-4 h-4" />
				)}
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 z-20 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
					{ACCESS_LEVELS.map((level) => {
						const Icon = level.icon;
						const isActive = level.value === currentLevel;
						return (
							<button
								key={level.value}
								onClick={() => handleSelect(level.value)}
								className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
									isActive
										? "bg-gray-50 dark:bg-surface-container"
										: "hover:bg-gray-50 dark:hover:bg-surface-container"
								}`}
							>
								<Icon className={`w-4 h-4 mt-0.5 shrink-0 ${level.color}`} />
								<div className="min-w-0">
									<div className="text-xs font-semibold text-gray-800 dark:text-on-surface flex items-center gap-1.5">
										{level.label}
										{isActive && <Check className="w-3 h-3 text-blue-600" />}
									</div>
									<div className="typo-badge text-gray-500 dark:text-on-surface-variant">
										{level.desc}
									</div>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

/* ─── Request access form (viewer side) ──────────────────────── */

export function RequestAccessButton({
	propertyId,
	documentId,
	documentName,
	viewerId,
	viewerName,
	viewerEmail,
	viewerAvatar,
	existingRequests,
	onRequested,
}: {
	propertyId: string;
	documentId: string;
	documentName: string;
	viewerId: string;
	viewerName: string;
	viewerEmail: string;
	viewerAvatar?: string;
	existingRequests: DocumentAccessRequest[];
	onRequested: (req: DocumentAccessRequest) => void;
}) {
	const [showForm, setShowForm] = useState(false);
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);

	// Check existing request status for this document
	const existingForDoc = existingRequests.find(
		(r) => r.documentId === documentId && r.requesterId === viewerId,
	);

	if (existingForDoc) {
		if (existingForDoc.status === AccessRequestStatus.PENDING) {
			return (
				<div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
					<Clock className="w-3.5 h-3.5" />
					Request pending
				</div>
			);
		}
		if (existingForDoc.status === AccessRequestStatus.APPROVED) {
			return (
				<div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
					<ShieldCheck className="w-3.5 h-3.5" />
					Access granted
				</div>
			);
		}
		if (existingForDoc.status === AccessRequestStatus.DENIED) {
			return (
				<div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium">
					<X className="w-3.5 h-3.5" />
					Access denied
				</div>
			);
		}
	}

	async function handleSubmit() {
		setSending(true);
		const result = await PropertyAPI.requestDocumentAccess(propertyId, {
			documentId,
			requesterId: viewerId,
			requesterName: viewerName,
			requesterEmail: viewerEmail,
			requesterAvatar: viewerAvatar,
			message: message.trim() || undefined,
		});
		if (result) {
			onRequested(result);
		}
		setSending(false);
		setShowForm(false);
		setMessage("");
	}

	if (showForm) {
		return (
			<div className="w-full max-w-xs bg-card border border-border rounded-xl p-3 space-y-2">
				<div className="text-xs font-semibold text-gray-800 dark:text-on-surface">
					Request access to &ldquo;{documentName}&rdquo;
				</div>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Optional message to the owner…"
					rows={2}
					className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-gray-50 dark:bg-surface-container focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none dark:text-on-surface"
				/>
				<div className="flex gap-2">
					<button
						onClick={handleSubmit}
						disabled={sending}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
					>
						<Send className="w-3 h-3" />
						{sending ? "Sending…" : "Send Request"}
					</button>
					<button
						onClick={() => {
							setShowForm(false);
							setMessage("");
						}}
						className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-surface-container text-gray-600 dark:text-on-surface-variant"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<button
			onClick={() => setShowForm(true)}
			className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
		>
			<Lock className="w-3.5 h-3.5" />
			Request Access
		</button>
	);
}

/* ─── Restricted doc placeholder (viewer sees when access is required) ── */

export function RestrictedDocumentRow({
	doc,
	propertyId,
	viewerId,
	viewerName,
	viewerEmail,
	viewerAvatar,
	existingRequests,
	onRequested,
}: {
	doc: PropertyDocument;
	propertyId: string;
	viewerId: string;
	viewerName: string;
	viewerEmail: string;
	viewerAvatar?: string;
	existingRequests: DocumentAccessRequest[];
	onRequested: (req: DocumentAccessRequest) => void;
}) {
	const approvedRequest = existingRequests.find(
		(r) =>
			r.documentId === doc.id &&
			r.requesterId === viewerId &&
			r.status === AccessRequestStatus.APPROVED,
	);

	// If approved, show the document normally
	if (approvedRequest) {
		return null; // Signal to parent to render normally
	}

	return (
		<div className="flex items-start justify-between px-5 py-3 gap-3">
			<div className="flex items-start gap-3 min-w-0">
				<div className="h-14 w-14 rounded-lg border border-border overflow-hidden shrink-0 bg-gray-50 dark:bg-surface-container flex items-center justify-center">
					<Lock className="w-5 h-5 text-gray-400 dark:text-on-surface-variant" />
				</div>
				<div className="min-w-0">
					<div className="text-sm font-medium text-gray-800 dark:text-on-surface truncate">
						{doc.name}
					</div>
					<div className="mt-1 text-xs text-gray-500 dark:text-on-surface-variant">
						Access required to view this document
					</div>
				</div>
			</div>
			<div className="shrink-0 mt-1">
				<RequestAccessButton
					propertyId={propertyId}
					documentId={doc.id}
					documentName={doc.name}
					viewerId={viewerId}
					viewerName={viewerName}
					viewerEmail={viewerEmail}
					viewerAvatar={viewerAvatar}
					existingRequests={existingRequests}
					onRequested={onRequested}
				/>
			</div>
		</div>
	);
}

/* ─── Access request management (owner side) ─────────────────── */

export function AccessRequestManager({
	propertyId,
	ownerId,
	documents,
}: {
	propertyId: string;
	ownerId: string;
	documents: PropertyDocument[];
}) {
	const [requests, setRequests] = useState<DocumentAccessRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [respondingId, setRespondingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		const data = await PropertyAPI.getDocumentAccessRequests(propertyId, {
			ownerId,
		});
		setRequests(data);
		setLoading(false);
	}, [propertyId, ownerId]);

	useEffect(() => {
		load();
	}, [load]);

	const pendingRequests = requests.filter(
		(r) => r.status === AccessRequestStatus.PENDING,
	);

	async function handleRespond(
		requestId: string,
		status: AccessRequestStatus.APPROVED | AccessRequestStatus.DENIED,
	) {
		setRespondingId(requestId);
		const updated = await PropertyAPI.respondToAccessRequest(propertyId, {
			requestId,
			status,
			ownerId,
		});
		if (updated) {
			setRequests((prev) =>
				prev.map((r) => (r.id === requestId ? { ...r, ...updated } : r)),
			);
		}
		setRespondingId(null);
	}

	if (loading) {
		return (
			<div className="text-xs text-gray-400 dark:text-on-surface-variant animate-pulse py-3">
				Loading requests…
			</div>
		);
	}

	if (pendingRequests.length === 0) {
		return null;
	}

	return (
		<div className="w-full max-w-2xl bg-card border border-amber-200 dark:border-amber-800/40 rounded-xl overflow-hidden">
			<div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/40">
				<div className="flex items-center gap-2">
					<Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
					<span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
						Document Access Requests
					</span>
					<span className="text-xs bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5">
						{pendingRequests.length} pending
					</span>
				</div>
			</div>
			<div className="divide-y divide-divider dark:divide-outline-variant/30">
				{pendingRequests.map((req) => {
					const doc = documents.find((d) => d.id === req.documentId);
					const isResponding = respondingId === req.id;

					return (
						<div key={req.id} className="px-5 py-3 space-y-2">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="text-sm font-medium text-gray-800 dark:text-on-surface">
										{req.requesterName}
									</div>
									<div className="text-xs text-gray-500 dark:text-on-surface-variant">
										{req.requesterEmail}
									</div>
								</div>
								<div className="typo-badge text-gray-400 dark:text-on-surface-variant shrink-0">
									{new Date(req.createdAt).toLocaleDateString()}
								</div>
							</div>

							<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-on-surface-variant">
								<FileText className="w-3 h-3" />
								Requesting access to:{" "}
								<span className="font-medium text-gray-700 dark:text-on-surface">
									{doc?.name ?? "Unknown document"}
								</span>
							</div>

							{req.message && (
								<div className="text-xs text-gray-600 dark:text-on-surface-variant bg-gray-50 dark:bg-surface-container rounded-lg px-3 py-2 italic">
									&ldquo;{req.message}&rdquo;
								</div>
							)}

							<div className="flex gap-2 pt-1">
								<button
									onClick={() =>
										handleRespond(req.id, AccessRequestStatus.APPROVED)
									}
									disabled={isResponding}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
								>
									<Check className="w-3 h-3" />
									Approve
								</button>
								<button
									onClick={() =>
										handleRespond(req.id, AccessRequestStatus.DENIED)
									}
									disabled={isResponding}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
								>
									<X className="w-3 h-3" />
									Deny
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
