"use client";

import { useAuth } from "@/components/AuthContext";
import UserAvatar from "@/components/ui/UserAvatar";
import UserLookupField, {
	type LookedUpUser,
	type LookupStatus,
} from "@/components/ui/UserLookupField";
import { OwnershipHistoryAPI, TransferAPI } from "@/lib/api";
import {
	OwnershipRecord,
	OwnershipTransfer,
	Property,
	TransferStatus,
} from "@/types/property";
import {
	ArrowRight,
	Building2,
	Calendar,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	Gift,
	Globe,
	Landmark,
	Plus,
	Send,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   Transfer Ownership Panel
   ═══════════════════════════════════════════════════════════════ */

function statusBadge(status: TransferStatus) {
	const map: Record<TransferStatus, { bg: string; text: string }> = {
		[TransferStatus.PENDING]: {
			bg: "bg-amber-100 text-amber-800",
			text: "Pending",
		},
		[TransferStatus.ACCEPTED]: {
			bg: "bg-blue-100 text-blue-800",
			text: "Accepted",
		},
		[TransferStatus.COMPLETED]: {
			bg: "bg-emerald-100 text-emerald-800",
			text: "Completed",
		},
		[TransferStatus.REJECTED]: {
			bg: "bg-red-100 text-red-800",
			text: "Rejected",
		},
		[TransferStatus.CANCELLED]: {
			bg: "bg-gray-100 text-gray-600",
			text: "Cancelled",
		},
	};
	const s = map[status];
	return (
		<span
			className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}
		>
			{s.text}
		</span>
	);
}

function TransferCard({
	transfer,
	isOwner,
	userId,
	onAction,
}: {
	transfer: OwnershipTransfer;
	isOwner: boolean;
	userId: string;
	onAction: () => void;
}) {
	const [responding, setResponding] = useState(false);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const isPending = transfer.status === TransferStatus.PENDING;
	const isSender = transfer.fromUserId === userId;
	const isRecipient = transfer.toUserId === userId;

	const handleAction = async (action: "accept" | "reject" | "cancel") => {
		setLoading(true);
		await TransferAPI.respondToTransfer(transfer.propertyId, {
			transferId: transfer.id,
			action,
			userId,
			responseMessage: msg || undefined,
		});
		setLoading(false);
		setResponding(false);
		onAction();
	};

	return (
		<div className="border border-border rounded-xl bg-card p-4 max-w-lg space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<UserAvatar
						name={transfer.fromName}
						avatar={transfer.fromAvatar}
						size="sm"
					/>
					<ArrowRight className="w-4 h-4 text-outline shrink-0" />
					<UserAvatar
						name={transfer.toName}
						avatar={transfer.toAvatar}
						size="sm"
					/>
					<span className="text-sm font-medium text-on-surface truncate">
						{transfer.toName}
					</span>
				</div>
				{statusBadge(transfer.status)}
			</div>

			{transfer.price ? (
				<p className="text-xs text-on-surface-variant">
					Sale price:{" "}
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
					})}
			</p>

			{isPending && (
				<div className="flex flex-wrap gap-2 pt-1">
					{isSender && (
						<button
							type="button"
							disabled={loading}
							onClick={() => handleAction("cancel")}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							<X className="w-3.5 h-3.5" /> Cancel
						</button>
					)}
					{isRecipient && (
						<>
							{!responding ? (
								<>
									<button
										type="button"
										disabled={loading}
										onClick={() => handleAction("accept")}
										className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
									>
										<Check className="w-3.5 h-3.5" /> Accept
									</button>
									<button
										type="button"
										disabled={loading}
										onClick={() => setResponding(true)}
										className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
									>
										<X className="w-3.5 h-3.5" /> Reject
									</button>
								</>
							) : (
								<div className="flex flex-col gap-2 w-full">
									<input
										value={msg}
										onChange={(e) => setMsg(e.target.value)}
										placeholder="Reason for rejection (optional)"
										className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-on-surface text-xs"
									/>
									<div className="flex gap-2">
										<button
											type="button"
											disabled={loading}
											onClick={() => handleAction("reject")}
											className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
										>
											Confirm Reject
										</button>
										<button
											type="button"
											onClick={() => setResponding(false)}
											className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
										>
											Back
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

interface TransferFormData {
	toName: string;
	toEmail: string;
	toUsername: string;
	message: string;
	transferDate: string;
	price: string;
}

export function TransferOwnershipPanel({ property }: { property: Property }) {
	const { user } = useAuth();
	const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
	const [form, setForm] = useState<TransferFormData>({
		toName: "",
		toEmail: "",
		toUsername: "",
		message: "",
		transferDate: new Date().toISOString().slice(0, 10),
		price: "",
	});

	const isOwner = user?.id === property.owner?.id;

	const handleUserFound = (user: LookedUpUser) => {
		setForm((prev) => ({
			...prev,
			toName: user.displayName || user.name,
			toEmail: user.email,
		}));
	};

	const handleUserCleared = () => {
		setForm((prev) => ({ ...prev, toName: "", toEmail: "" }));
	};

	const fetchTransfers = useCallback(async () => {
		setLoading(true);
		const data = await TransferAPI.getTransfers(property.id);
		setTransfers(data);
		setLoading(false);
	}, [property.id]);

	useEffect(() => {
		fetchTransfers();
	}, [fetchTransfers]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setSubmitting(true);
		setError(null);

		if (!form.toEmail && !form.toUsername) {
			setError("Provide either an email or username for the recipient");
			setSubmitting(false);
			return;
		}

		const { transfer, error: err } = await TransferAPI.initiateTransfer(
			property.id,
			{
				fromUserId: user.id,
				toName: form.toName,
				toEmail: form.toEmail || undefined,
				toUsername: form.toUsername || undefined,
				message: form.message || undefined,
				transferDate: form.transferDate || undefined,
				price: form.price ? Number(form.price) : undefined,
			},
		);

		if (err) {
			setError(err);
		} else {
			setShowForm(false);
			setForm({
				toName: "",
				toEmail: "",
				toUsername: "",
				message: "",
				transferDate: new Date().toISOString().slice(0, 10),
				price: "",
			});
			fetchTransfers();
		}
		setSubmitting(false);
	};

	const hasPending = transfers.some((t) => t.status === TransferStatus.PENDING);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
					<Send className="w-4 h-4" /> Transfer Ownership
				</h3>
				{isOwner && !hasPending && (
					<button
						type="button"
						onClick={() => setShowForm(!showForm)}
						className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:opacity-90 transition-opacity"
					>
						<Plus className="w-3.5 h-3.5" /> New Transfer
					</button>
				)}
			</div>

			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="border border-border rounded-xl bg-card p-4 max-w-lg space-y-3"
				>
					<p className="text-xs text-on-surface-variant">
						Transfer ownership of <strong>{property.name}</strong> to another
						person or entity.
					</p>

					<label className="block">
						<span className="text-xs font-medium text-on-surface-variant">
							Username
						</span>
						<div className="mt-1">
							<UserLookupField
								value={form.toUsername}
								onChange={(v) =>
									setForm((prev) => ({ ...prev, toUsername: v }))
								}
								onUserFound={handleUserFound}
								onUserCleared={handleUserCleared}
								onStatusChange={setLookupStatus}
								placeholder="@janedoe"
							/>
						</div>
					</label>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Recipient Name{lookupStatus !== "found" ? " *" : ""}
							</span>
							<input
								required={lookupStatus !== "found"}
								value={form.toName}
								onChange={(e) => setForm({ ...form, toName: e.target.value })}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="Jane Doe"
								readOnly={lookupStatus === "found"}
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Email{lookupStatus !== "found" && !form.toUsername ? " *" : ""}
							</span>
							<input
								type="email"
								value={form.toEmail}
								onChange={(e) => setForm({ ...form, toEmail: e.target.value })}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="jane@example.com"
								readOnly={lookupStatus === "found"}
							/>
						</label>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Transfer Date
							</span>
							<input
								type="date"
								value={form.transferDate}
								onChange={(e) =>
									setForm({ ...form, transferDate: e.target.value })
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Sale Price (optional)
							</span>
							<input
								type="number"
								min={0}
								step="any"
								value={form.price}
								onChange={(e) => setForm({ ...form, price: e.target.value })}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="0"
							/>
						</label>
					</div>

					<label className="block">
						<span className="text-xs font-medium text-on-surface-variant">
							Message (optional)
						</span>
						<textarea
							value={form.message}
							onChange={(e) => setForm({ ...form, message: e.target.value })}
							rows={2}
							className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm resize-none"
							placeholder="Note to recipient…"
						/>
					</label>

					{error && <p className="text-xs text-red-600">{error}</p>}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={submitting}
							className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							<Send className="w-4 h-4" />
							{submitting ? "Sending…" : "Initiate Transfer"}
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{loading ? (
				<p className="text-xs text-outline animate-pulse">Loading transfers…</p>
			) : transfers.length === 0 ? (
				<p className="text-xs text-outline">No transfers on record.</p>
			) : (
				<div className="space-y-3">
					{transfers.map((t) => (
						<TransferCard
							key={t.id}
							transfer={t}
							isOwner={isOwner}
							userId={user?.id || ""}
							onAction={fetchTransfers}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   Ownership History Timeline
   ═══════════════════════════════════════════════════════════════ */

const ownerTypeIcon: Record<string, typeof User> = {
	individual: User,
	company: Building2,
	trust: Users,
	government: Landmark,
	external: Globe,
};

const methodLabels: Record<string, string> = {
	purchase: "Purchased",
	inheritance: "Inherited",
	gift: "Gift",
	government_grant: "Government Grant",
	development: "Developed",
	transfer: "Transferred",
	other: "Other",
};

function RecordCard({
	record,
	isOwner,
	isCurrent,
	onDelete,
}: {
	record: OwnershipRecord;
	isOwner: boolean;
	isCurrent: boolean;
	onDelete: () => void;
}) {
	const Icon = ownerTypeIcon[record.ownerType] || User;

	return (
		<div className="relative pl-8">
			{/* Timeline dot */}
			<div
				className={`absolute left-0 top-2 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
					isCurrent ? "border-primary bg-primary/10" : "border-border bg-card"
				}`}
			>
				<div
					className={`w-2 h-2 rounded-full ${isCurrent ? "bg-primary" : "bg-outline"}`}
				/>
			</div>

			<div className="border border-border rounded-xl bg-card p-4 max-w-lg space-y-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						{record.ownerAvatar ? (
							<UserAvatar
								name={record.ownerName}
								avatar={record.ownerAvatar}
								size="sm"
							/>
						) : (
							<div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center">
								<Icon className="w-3.5 h-3.5 text-on-surface-variant" />
							</div>
						)}
						<div className="min-w-0">
							<p className="text-sm font-medium text-on-surface truncate">
								{record.ownerName}
								{isCurrent && (
									<span className="ml-2 text-xs text-primary font-normal">
										(Current Owner)
									</span>
								)}
							</p>
							<p className="text-xs text-outline capitalize">
								{record.ownerType}
							</p>
						</div>
					</div>
					{isOwner && !record.transferId && (
						<button
							type="button"
							onClick={onDelete}
							className="p-1 rounded hover:bg-surface-container-high transition-colors"
							title="Remove record"
						>
							<Trash2 className="w-3.5 h-3.5 text-outline" />
						</button>
					)}
				</div>

				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
					<span className="flex items-center gap-1">
						<Gift className="w-3 h-3" />
						{methodLabels[record.acquisitionMethod] || record.acquisitionMethod}
					</span>
					{record.acquiredDate && (
						<span className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							{new Date(record.acquiredDate).toLocaleDateString(undefined, {
								year: "numeric",
								month: "short",
								day: "numeric",
							})}
						</span>
					)}
					{record.transferredDate && (
						<span className="flex items-center gap-1">
							<ArrowRight className="w-3 h-3" />
							{new Date(record.transferredDate).toLocaleDateString(undefined, {
								year: "numeric",
								month: "short",
								day: "numeric",
							})}
						</span>
					)}
					{record.price ? (
						<span className="font-medium text-on-surface">
							{record.price.toLocaleString()}
						</span>
					) : null}
				</div>

				{record.notes && (
					<p className="text-xs text-outline italic">{record.notes}</p>
				)}
			</div>
		</div>
	);
}

interface HistoryFormData {
	ownerName: string;
	ownerEmail: string;
	ownerType: string;
	acquiredDate: string;
	transferredDate: string;
	acquisitionMethod: string;
	price: string;
	notes: string;
}

const emptyHistoryForm: HistoryFormData = {
	ownerName: "",
	ownerEmail: "",
	ownerType: "individual",
	acquiredDate: "",
	transferredDate: "",
	acquisitionMethod: "purchase",
	price: "",
	notes: "",
};

export function OwnershipHistoryPanel({ property }: { property: Property }) {
	const { user } = useAuth();
	const [records, setRecords] = useState<OwnershipRecord[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<HistoryFormData>(emptyHistoryForm);

	const isOwner = user?.id === property.owner?.id;

	const fetchHistory = useCallback(async () => {
		setLoading(true);
		const data = await OwnershipHistoryAPI.getHistory(property.id);
		setRecords(data);
		setLoading(false);
	}, [property.id]);

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		const { record, error: err } = await OwnershipHistoryAPI.addRecord(
			property.id,
			{
				ownerName: form.ownerName,
				ownerEmail: form.ownerEmail || undefined,
				ownerType: form.ownerType,
				acquiredDate: form.acquiredDate || undefined,
				transferredDate: form.transferredDate || undefined,
				acquisitionMethod: form.acquisitionMethod,
				price: form.price ? Number(form.price) : undefined,
				notes: form.notes || undefined,
			},
		);

		if (err) {
			setError(err);
		} else {
			setShowForm(false);
			setForm(emptyHistoryForm);
			fetchHistory();
		}
		setSubmitting(false);
	};

	const handleDelete = async (recordId: string) => {
		await OwnershipHistoryAPI.deleteRecord(property.id, recordId);
		fetchHistory();
	};

	// Determine which record is the current owner (last one without transferredDate)
	const currentRecordId = records.find((r) => !r.transferredDate)?.id;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
					<Clock className="w-4 h-4" /> Ownership History
				</h3>
				{isOwner && (
					<button
						type="button"
						onClick={() => setShowForm(!showForm)}
						className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:opacity-90 transition-opacity"
					>
						<Plus className="w-3.5 h-3.5" /> Add Past Owner
					</button>
				)}
			</div>

			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="border border-border rounded-xl bg-card p-4 max-w-lg space-y-3"
				>
					<p className="text-xs text-on-surface-variant">
						Record a previous owner of this property (before your ownership or
						for off-platform history).
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Owner Name *
							</span>
							<input
								required
								value={form.ownerName}
								onChange={(e) =>
									setForm({ ...form, ownerName: e.target.value })
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="Previous owner name"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Email (optional)
							</span>
							<input
								type="email"
								value={form.ownerEmail}
								onChange={(e) =>
									setForm({ ...form, ownerEmail: e.target.value })
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="email@example.com"
							/>
						</label>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Owner Type *
							</span>
							<select
								value={form.ownerType}
								onChange={(e) =>
									setForm({ ...form, ownerType: e.target.value })
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
							>
								<option value="individual">Individual</option>
								<option value="company">Company</option>
								<option value="trust">Trust</option>
								<option value="government">Government</option>
								<option value="external">External Entity</option>
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Acquisition Method *
							</span>
							<select
								value={form.acquisitionMethod}
								onChange={(e) =>
									setForm({
										...form,
										acquisitionMethod: e.target.value,
									})
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
							>
								<option value="purchase">Purchase</option>
								<option value="inheritance">Inheritance</option>
								<option value="gift">Gift</option>
								<option value="government_grant">Government Grant</option>
								<option value="development">Development</option>
								<option value="transfer">Transfer</option>
								<option value="other">Other</option>
							</select>
						</label>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Acquired
							</span>
							<input
								type="date"
								value={form.acquiredDate}
								onChange={(e) =>
									setForm({ ...form, acquiredDate: e.target.value })
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Transferred
							</span>
							<input
								type="date"
								value={form.transferredDate}
								onChange={(e) =>
									setForm({
										...form,
										transferredDate: e.target.value,
									})
								}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-on-surface-variant">
								Price
							</span>
							<input
								type="number"
								min={0}
								step="any"
								value={form.price}
								onChange={(e) => setForm({ ...form, price: e.target.value })}
								className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm"
								placeholder="0"
							/>
						</label>
					</div>

					<label className="block">
						<span className="text-xs font-medium text-on-surface-variant">
							Notes
						</span>
						<textarea
							value={form.notes}
							onChange={(e) => setForm({ ...form, notes: e.target.value })}
							rows={2}
							className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-on-surface text-sm resize-none"
							placeholder="Any relevant context…"
						/>
					</label>

					{error && <p className="text-xs text-red-600">{error}</p>}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={submitting}
							className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							<Plus className="w-4 h-4" />
							{submitting ? "Saving…" : "Add Record"}
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{loading ? (
				<p className="text-xs text-outline animate-pulse">Loading history…</p>
			) : records.length === 0 ? (
				<p className="text-xs text-outline">
					No ownership history recorded yet.
					{isOwner &&
						" Add past owners to build a chain-of-title for this property."}
				</p>
			) : (
				<div className="relative space-y-4">
					{/* Timeline line */}
					<div className="absolute left-[9px] top-4 bottom-4 w-px bg-border" />
					{records.map((r) => (
						<RecordCard
							key={r.id}
							record={r}
							isOwner={isOwner}
							isCurrent={r.id === currentRecordId}
							onDelete={() => handleDelete(r.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   Combined wrapper (used in PropertyFullView)
   ═══════════════════════════════════════════════════════════════ */

export default function OwnershipPanel({ property }: { property: Property }) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div className="space-y-4 max-w-xl">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-2 text-sm font-semibold text-on-surface"
			>
				Ownership & Transfers
				{expanded ? (
					<ChevronUp className="w-4 h-4" />
				) : (
					<ChevronDown className="w-4 h-4" />
				)}
			</button>

			{expanded && (
				<div className="space-y-8">
					<TransferOwnershipPanel property={property} />
					<OwnershipHistoryPanel property={property} />
				</div>
			)}
		</div>
	);
}
