"use client";

import ChipInput from "@/components/ui/ChipInput";
import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentAccessRequest,
	DocumentType,
	Property,
	PropertyCondition,
	PropertyStatus,
} from "@/types/property";
import {
	Calendar,
	Check,
	ChevronDown,
	Copy,
	Download,
	Edit3,
	FileText,
	MapPin,
	Pencil,
	Plus,
	Trash2,
	TrendingUp,
	Upload,
	User,
	Users,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
	AccessRequestManager,
	DocumentAccessLevelPicker,
	RestrictedDocumentRow,
} from "./DocumentAccessControl";

const PropertyMiniMap = dynamic(
	() => import("@/components/maps/PropertyMiniMap"),
	{ ssr: false },
);

const API_BASE = "/api";

export function formatCurrency(amount: number): string {
	const safe = Number.isFinite(amount) ? amount : 0;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
	}).format(safe);
}

export function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function getStatusColor(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-100 text-green-700 border-green-200";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-100 text-blue-700 border-blue-200";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-100 text-yellow-700 border-yellow-200";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-100 text-orange-700 border-orange-200";
		case PropertyStatus.RENTED:
			return "bg-purple-100 text-purple-700 border-purple-200";
		default:
			return "bg-surface-container-high text-on-surface-variant border-border";
	}
}

export const DOCUMENT_CATEGORIES: { type: DocumentType; label: string }[] = [
	{ type: DocumentType.CONTRACT_OF_SALE, label: "Contract of Sale" },
	{
		type: DocumentType.CERTIFICATE_OF_OCCUPANCY,
		label: "Certificate of Occupancy",
	},
	{ type: DocumentType.BUILDING_PERMIT, label: "Building Permit" },
	{ type: DocumentType.INSPECTION_REPORT, label: "Inspection Report" },
	{ type: DocumentType.SURVEY, label: "Survey Documents" },
	{ type: DocumentType.DEED, label: "Deed" },
	{ type: DocumentType.TITLE, label: "Title Documents" },
	{ type: DocumentType.APPRAISAL, label: "Appraisal" },
	{ type: DocumentType.OTHER, label: "Other Documents" },
];

const IMAGE_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"bmp",
	"svg",
	"heic",
	"heif",
]);

function getFileExtension(name: string, url: string): string {
	const candidate = (name || url).split("?")[0];
	const chunks = candidate.split(".");
	if (chunks.length < 2) return "";
	return chunks[chunks.length - 1].toLowerCase();
}

function getFileKind(name: string, url: string): "image" | "pdf" | "document" {
	const extension = getFileExtension(name, url);
	if (IMAGE_EXTENSIONS.has(extension)) return "image";
	if (extension === "pdf") return "pdf";
	return "document";
}

function getDocumentTypeLabel(type: DocumentType): string {
	const category = DOCUMENT_CATEGORIES.find((entry) => entry.type === type);
	return category?.label ?? type.replace(/_/g, " ");
}

// ----- Editable inline text -----
export function EditableInline({
	value,
	placeholder,
	onSave,
}: {
	value: string;
	placeholder: string;
	onSave: (val: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);

	if (editing) {
		return (
			<div className="flex gap-2">
				<input
					autoFocus
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder={placeholder}
					className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							onSave(draft);
							setEditing(false);
						}
						if (e.key === "Escape") {
							setDraft(value);
							setEditing(false);
						}
					}}
				/>
				<button
					onClick={() => {
						onSave(draft);
						setEditing(false);
					}}
					className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm"
				>
					<Check className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={() => {
						setDraft(value);
						setEditing(false);
					}}
					className="p-1.5 border border-border rounded-lg hover:bg-surface-container"
				>
					<X className="w-3.5 h-3.5 text-outline" />
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={() => {
				setDraft(value);
				setEditing(true);
			}}
			className="text-left text-sm text-on-surface hover:text-on-surface group flex items-center gap-2"
		>
			<span className={value ? "" : "text-outline italic"}>
				{value || placeholder}
			</span>
			<Pencil className="w-3 h-3 text-outline-variant group-hover:text-outline transition-colors" />
		</button>
	);
}

// ----- Editable tag list -----
export function EditableTagList({
	label,
	icon: Icon,
	items,
	placeholder,
	onSave,
}: {
	label: string;
	icon: React.ElementType;
	items: string[];
	placeholder: string;
	onSave: (items: string[]) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string[]>(items);
	const [input, setInput] = useState("");

	function addItem() {
		const trimmed = input.trim();
		if (trimmed && !draft.includes(trimmed)) setDraft([...draft, trimmed]);
		setInput("");
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2 text-sm text-outline">
					<Icon className="w-4 h-4" />
					<span className="font-medium">{label}</span>
				</div>
				{!editing && (
					<button
						onClick={() => {
							setDraft(items);
							setEditing(true);
						}}
						className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface-variant"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{editing ? (
				<div>
					<div className="flex flex-wrap gap-1.5 mb-2">
						{draft.map((item, i) => (
							<span
								key={i}
								className="flex items-center gap-1 px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full text-sm"
							>
								{item}
								<button
									onClick={() => setDraft(draft.filter((_, j) => j !== i))}
									className="hover:text-red-500"
								>
									<X className="w-3 h-3" />
								</button>
							</span>
						))}
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && addItem()}
							placeholder={placeholder}
							className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
						/>
						<button
							onClick={addItem}
							className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-sm"
						>
							Add
						</button>
					</div>
					<div className="flex gap-2 mt-2">
						<button
							onClick={() => {
								onSave(draft);
								setEditing(false);
							}}
							className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
						>
							<Check className="w-3.5 h-3.5" /> Save
						</button>
						<button
							onClick={() => {
								setDraft(items);
								setInput("");
								setEditing(false);
							}}
							className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-container"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-wrap gap-1.5 min-h-7">
					{items.length === 0 ? (
						<span className="text-sm text-outline italic">None recorded</span>
					) : (
						items.map((item, i) => (
							<span
								key={i}
								className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full text-sm"
							>
								{item}
							</span>
						))
					)}
				</div>
			)}
		</div>
	);
}

// ----- Document card (book-style) -----
function DocumentCard({
	doc,
	propertyId,
	isOwner,
	onDeleted,
	onTypeChanged,
	onAccessLevelChanged,
	viewerId,
	viewerName,
	viewerEmail,
	viewerAvatar,
	accessRequests = [],
	onAccessRequested,
}: {
	doc: Property["documents"][0];
	propertyId: string;
	isOwner: boolean;
	onDeleted: (docId: string) => void;
	onTypeChanged: (docId: string, newType: DocumentType) => void;
	onAccessLevelChanged?: (docId: string, level: DocumentAccessLevel) => void;
	viewerId?: string;
	viewerName?: string;
	viewerEmail?: string;
	viewerAvatar?: string;
	accessRequests?: DocumentAccessRequest[];
	onAccessRequested?: (req: DocumentAccessRequest) => void;
}) {
	const [typeOpen, setTypeOpen] = useState(false);
	const typeRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
				setTypeOpen(false);
			}
		}
		if (typeOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [typeOpen]);

	const accessLevel = doc.accessLevel ?? DocumentAccessLevel.PUBLIC;
	const kind = getFileKind(doc.name, doc.url);
	const extension = getFileExtension(doc.name, doc.url);
	const extensionLabel =
		kind === "pdf"
			? "PDF"
			: extension
				? extension.toUpperCase().slice(0, 5)
				: "FILE";

	// Viewer mode: restricted docs show access gate
	if (!isOwner && accessLevel === DocumentAccessLevel.REQUEST_REQUIRED) {
		const hasApproved = accessRequests.some(
			(r) =>
				r.documentId === doc.id &&
				r.requesterId === viewerId &&
				r.status === AccessRequestStatus.APPROVED,
		);
		if (
			!hasApproved &&
			viewerId &&
			viewerName &&
			viewerEmail &&
			onAccessRequested
		) {
			return (
				<RestrictedDocumentRow
					key={doc.id}
					doc={doc}
					propertyId={propertyId}
					viewerId={viewerId}
					viewerName={viewerName}
					viewerEmail={viewerEmail}
					viewerAvatar={viewerAvatar}
					existingRequests={accessRequests}
					onRequested={onAccessRequested}
				/>
			);
		}
	}

	// Viewer mode: private docs hidden
	if (!isOwner && accessLevel === DocumentAccessLevel.PRIVATE) return null;

	async function handleDelete(docId: string) {
		try {
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents?docId=${docId}`,
				{ method: "DELETE" },
			);
			if (res.ok) onDeleted(docId);
		} catch {
			/* silent */
		}
	}

	return (
		<div className="w-36 flex flex-col rounded-xl border border-border border-border overflow-hidden bg-card group relative shrink-0">
			{/* Thumbnail / icon area */}
			<div className="h-40 flex flex-col items-center justify-center bg-surface-container dark:bg-surface-container relative">
				{kind === "image" ? (
					<img
						src={doc.url}
						alt={doc.name}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex flex-col items-center gap-2 text-outline dark:text-on-surface-variant">
						<FileText className="w-7 h-7" />
						<span className="text-[10px] font-semibold uppercase tracking-wide">
							{extensionLabel}
						</span>
					</div>
				)}
				{/* Hover actions */}
				<div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
					<a
						href={doc.url}
						target="_blank"
						rel="noopener noreferrer"
						className="p-1 bg-white/90 dark:bg-surface-container-high/90 rounded-md shadow text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface"
						title="Open"
					>
						<Download className="w-3.5 h-3.5" />
					</a>
					{isOwner && (
						<>
							<DocumentAccessLevelPicker
								docId={doc.id}
								propertyId={propertyId}
								currentLevel={accessLevel}
								onChanged={(docId, level) =>
									onAccessLevelChanged?.(docId, level)
								}
							/>
							<button
								onClick={() => handleDelete(doc.id)}
								className="p-1 bg-white/90 dark:bg-surface-container-high/90 rounded-md shadow text-outline hover:text-red-500"
								title="Delete"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</>
					)}
				</div>
			</div>

			{/* Name */}
			<div className="px-2 pt-1.5 pb-1">
				<div
					className="text-[11px] font-medium text-on-surface dark:text-on-surface truncate"
					title={doc.name}
				>
					{doc.name}
				</div>
				<div className="text-[10px] text-outline dark:text-on-surface-variant">
					{new Date(doc.uploadDate).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</div>
			</div>

			{/* Type at bottom — clickable to change */}
			<div className="px-2 pb-2 mt-auto relative" ref={typeRef}>
				<button
					onClick={() => isOwner && setTypeOpen(!typeOpen)}
					className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container-high text-on-surface-variant dark:text-on-surface-variant truncate max-w-full ${isOwner ? "hover:bg-surface-container-highest dark:hover:bg-surface-container cursor-pointer" : ""}`}
					title={
						isOwner ? "Click to change type" : getDocumentTypeLabel(doc.type)
					}
				>
					{getDocumentTypeLabel(doc.type)}
				</button>
				{typeOpen && (
					<div className="absolute bottom-full left-0 mb-1 bg-card border border-border border-border rounded-lg shadow-lg z-30 py-1 w-48">
						{DOCUMENT_CATEGORIES.map((cat) => (
							<button
								key={cat.type}
								onClick={() => {
									onTypeChanged(doc.id, cat.type);
									setTypeOpen(false);
								}}
								className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container dark:hover:bg-surface-container ${doc.type === cat.type ? "font-semibold text-on-surface dark:text-on-surface" : "text-on-surface-variant dark:text-on-surface-variant"}`}
							>
								{cat.label}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ----- Document upload button (with type picker) -----
function DocumentUploadButton({
	propertyId,
	onUploaded,
}: {
	propertyId: string;
	onUploaded: (doc: Property["documents"][0]) => void;
}) {
	const [selectedType, setSelectedType] = useState<DocumentType>(
		DocumentType.OTHER,
	);
	const [typeOpen, setTypeOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadDone, setUploadDone] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setTypeOpen(false);
			}
		}
		if (typeOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [typeOpen]);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		setUploadError(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", selectedType);
			formData.append("name", file.name);
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents`,
				{ method: "POST", body: formData },
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Upload failed");
			}
			const { document } = await res.json();
			onUploaded(document);
			setUploadDone(true);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	return (
		<div className="w-32 shrink-0 flex flex-col items-center rounded-xl border-2 border-dashed border-border border-border bg-surface-container/50 dark:bg-surface-container/50 hover:bg-surface-container-high dark:hover:bg-surface-container transition-colors">
			{/* Type selector */}
			<div className="relative mt-3 px-2 w-full" ref={dropdownRef}>
				<button
					onClick={() => setTypeOpen(!typeOpen)}
					className="w-full flex items-center justify-center gap-1 text-[10px] text-outline dark:text-on-surface-variant hover:text-on-surface-variant dark:hover:text-on-surface uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-card border border-border border-border"
				>
					<span className="truncate">{getDocumentTypeLabel(selectedType)}</span>
					<ChevronDown className="w-3 h-3 shrink-0" />
				</button>
				{typeOpen && (
					<div className="absolute top-full left-0 mt-1 bg-card border border-border border-border rounded-lg shadow-lg z-30 py-1 w-48">
						{DOCUMENT_CATEGORIES.map((cat) => (
							<button
								key={cat.type}
								onClick={() => {
									setSelectedType(cat.type);
									setTypeOpen(false);
								}}
								className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container dark:hover:bg-surface-container ${selectedType === cat.type ? "font-semibold text-on-surface dark:text-on-surface" : "text-on-surface-variant dark:text-on-surface-variant"}`}
							>
								{cat.label}
							</button>
						))}
					</div>
				)}
			</div>
			{/* Upload area */}
			{uploadDone ? (
				<div className="flex-1 flex flex-col items-center justify-center py-6 w-full gap-2">
					<Check className="w-5 h-5 text-green-500" />
					<span className="text-[10px] text-green-500 font-medium">
						Uploaded
					</span>
					<button
						onClick={() => setUploadDone(false)}
						className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline mt-1"
					>
						<Plus className="w-3.5 h-3.5" />
						Add another
					</button>
				</div>
			) : (
				<label className="flex-1 flex flex-col items-center justify-center cursor-pointer py-6 w-full">
					{uploading ? (
						<>
							<Upload className="w-5 h-5 text-outline dark:text-on-surface-variant animate-pulse" />
							<span className="text-[10px] text-outline dark:text-on-surface-variant mt-1">
								Uploading…
							</span>
						</>
					) : (
						<>
							<Plus className="w-5 h-5 text-outline dark:text-on-surface-variant" />
							<span className="text-[10px] text-outline dark:text-on-surface-variant mt-1">
								Upload
							</span>
						</>
					)}
					<input
						ref={inputRef}
						type="file"
						className="hidden"
						disabled={uploading}
						onChange={handleFileChange}
					/>
				</label>
			)}
			{uploadError && (
				<div className="px-2 pb-2 text-[10px] text-red-500 text-center">
					{uploadError}
				</div>
			)}
		</div>
	);
}

// ----- Documents grid (only shows when docs exist or owner) -----
export function DocumentsGrid({
	documents,
	propertyId,
	onUploaded,
	onDeleted,
	onTypeChanged,
	isOwner = true,
	onAccessLevelChanged,
	viewerId,
	viewerName,
	viewerEmail,
	viewerAvatar,
	accessRequests = [],
	onAccessRequested,
}: {
	documents: Property["documents"];
	propertyId: string;
	onUploaded: (doc: Property["documents"][0]) => void;
	onDeleted: (docId: string) => void;
	onTypeChanged: (docId: string, newType: DocumentType) => void;
	isOwner?: boolean;
	onAccessLevelChanged?: (docId: string, level: DocumentAccessLevel) => void;
	viewerId?: string;
	viewerName?: string;
	viewerEmail?: string;
	viewerAvatar?: string;
	accessRequests?: DocumentAccessRequest[];
	onAccessRequested?: (req: DocumentAccessRequest) => void;
}) {
	const hasDocuments = documents.length > 0;
	if (!hasDocuments && !isOwner) return null;

	return (
		<div className="flex flex-wrap gap-3 items-start">
			{isOwner && (
				<DocumentUploadButton propertyId={propertyId} onUploaded={onUploaded} />
			)}
			{documents.map((doc) => (
				<DocumentCard
					key={doc.id}
					doc={doc}
					propertyId={propertyId}
					isOwner={isOwner}
					onDeleted={onDeleted}
					onTypeChanged={onTypeChanged}
					onAccessLevelChanged={onAccessLevelChanged}
					viewerId={viewerId}
					viewerName={viewerName}
					viewerEmail={viewerEmail}
					viewerAvatar={viewerAvatar}
					accessRequests={accessRequests}
					onAccessRequested={onAccessRequested}
				/>
			))}
		</div>
	);
}

// ----- Worth editor -----
export function WorthEditor({
	currentValue,
	purchasePrice,
	onSave,
}: {
	currentValue?: number;
	purchasePrice: number;
	onSave: (value: number) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(
		currentValue != null ? currentValue.toLocaleString("en-US") : "",
	);
	const [saving, setSaving] = useState(false);

	const worthChange =
		currentValue != null
			? ((currentValue - purchasePrice) / purchasePrice) * 100
			: null;

	async function save() {
		const val = parseFloat(draft.replace(/[^0-9.]/g, ""));
		if (isNaN(val) || val < 0) return;
		setSaving(true);
		await onSave(val);
		setSaving(false);
		setEditing(false);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-2 text-sm text-outline">
					<TrendingUp className="w-4 h-4" />
					<span className="font-medium">Current Worth</span>
				</div>
				{!editing && (
					<button
						onClick={() => {
							setDraft(
								currentValue != null
									? currentValue.toLocaleString("en-US")
									: "",
							);
							setEditing(true);
						}}
						className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface-variant"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
			{editing ? (
				<div className="flex gap-2 items-center">
					<input
						type="text"
						inputMode="numeric"
						value={draft}
						onChange={(e) => {
							const raw = e.target.value.replace(/[^0-9.]/g, "");
							const parts = raw.split(".");
							parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
							setDraft(parts.join("."));
						}}
						placeholder="Enter amount"
						className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
					/>
					<button
						onClick={save}
						disabled={saving}
						className="flex items-center gap-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
					>
						<Check className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => setEditing(false)}
						className="p-2 border border-border rounded-lg hover:bg-surface-container"
					>
						<X className="w-3.5 h-3.5 text-outline" />
					</button>
				</div>
			) : (
				<div>
					<div className="text-xl font-bold text-on-surface">
						{currentValue != null ? (
							formatCurrency(currentValue)
						) : (
							<span className="text-outline text-base font-normal italic">
								Not set — click edit to add
							</span>
						)}
					</div>
					{worthChange !== null && (
						<div
							className={`text-sm font-medium mt-0.5 ${worthChange >= 0 ? "text-green-600" : "text-red-600"}`}
						>
							{worthChange >= 0 ? "▲" : "▼"} {Math.abs(worthChange).toFixed(1)}%
							vs purchase price
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-xs text-outline mb-0.5">{label}</div>
			<div className="text-sm font-medium text-on-surface">{value}</div>
		</div>
	);
}

// ----- Condition tag editor -----
const CONDITION_LABELS: Record<PropertyCondition, string> = {
	[PropertyCondition.BUSH]: "Bush",
	[PropertyCondition.CLEARED]: "Cleared",
	[PropertyCondition.FOUNDATION]: "Foundation",
	[PropertyCondition.HAS_STRUCTURE]: "Has Structure",
	[PropertyCondition.FENCED]: "Fenced",
	[PropertyCondition.PAVED]: "Paved",
	[PropertyCondition.WATERLOGGED]: "Waterlogged",
	[PropertyCondition.ROCKY]: "Rocky",
	[PropertyCondition.UNDER_CONSTRUCTION]: "Under Construction",
	[PropertyCondition.FINISHED]: "Finished",
	[PropertyCondition.RENOVATED]: "Renovated",
	[PropertyCondition.NEEDS_REPAIR]: "Needs Repair",
};

const CONDITION_COLORS: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]: "bg-lime-50 text-lime-700 border-lime-200",
	[PropertyCondition.CLEARED]: "bg-amber-50 text-amber-700 border-amber-200",
	[PropertyCondition.FOUNDATION]:
		"bg-orange-50 text-orange-700 border-orange-200",
	[PropertyCondition.HAS_STRUCTURE]: "bg-sky-50 text-sky-700 border-sky-200",
	[PropertyCondition.FENCED]: "bg-violet-50 text-violet-700 border-violet-200",
	[PropertyCondition.PAVED]: "bg-slate-50 text-slate-700 border-slate-200",
	[PropertyCondition.WATERLOGGED]: "bg-cyan-50 text-cyan-700 border-cyan-200",
	[PropertyCondition.ROCKY]: "bg-stone-50 text-stone-700 border-stone-200",
	[PropertyCondition.UNDER_CONSTRUCTION]:
		"bg-yellow-50 text-yellow-700 border-yellow-200",
	[PropertyCondition.FINISHED]:
		"bg-emerald-50 text-emerald-700 border-emerald-200",
	[PropertyCondition.RENOVATED]: "bg-teal-50 text-teal-700 border-teal-200",
	[PropertyCondition.NEEDS_REPAIR]: "bg-red-50 text-red-700 border-red-200",
};

function ConditionTagEditor({
	conditions,
	onSave,
}: {
	conditions: string[];
	onSave: (items: string[]) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string[]>(conditions);

	const formatLabel = (v: string) =>
		CONDITION_LABELS[v as PropertyCondition] ?? v;

	const colorFor = (c: string) =>
		CONDITION_COLORS[c as PropertyCondition] ??
		"bg-slate-50 text-slate-700 border-slate-200";

	return (
		<div className="bg-card border border-border rounded-xl p-5 space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
					Property Condition
				</h2>
				{!editing && (
					<button
						onClick={() => {
							setDraft(conditions);
							setEditing(true);
						}}
						className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface-variant"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{editing ? (
				<div className="space-y-3">
					<ChipInput
						value={draft}
						onChange={setDraft}
						suggestions={Object.keys(CONDITION_LABELS)}
						formatLabel={formatLabel}
						placeholder="Type to search or add…"
					/>
					<div className="flex gap-2">
						<button
							onClick={() => {
								onSave(draft);
								setEditing(false);
							}}
							className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
						>
							<Check className="w-3.5 h-3.5" /> Save
						</button>
						<button
							onClick={() => {
								setDraft(conditions);
								setEditing(false);
							}}
							className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-container"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-wrap gap-1.5 min-h-7">
					{conditions.length === 0 ? (
						<span className="text-sm text-outline italic">
							No conditions set — click edit to add
						</span>
					) : (
						conditions.map((c) => (
							<span
								key={c}
								className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorFor(c)}`}
							>
								{formatLabel(c)}
							</span>
						))
					)}
				</div>
			)}
		</div>
	);
}

// ===========================
// Main shared content body
// ===========================
export interface PropertyDetailContentProps {
	property: Property;
	onPatch: (updates: Partial<Property>) => void;
	onDocUploaded: (doc: Property["documents"][0]) => void;
	onDocDeleted: (docId: string) => void;
	/** Layout variant: "two-col" (default, for full page) or "stack" (for drawer) */
	layout?: "two-col" | "stack";
	/** Whether the current user is the property owner (default: true) */
	isOwner?: boolean;
	/** Viewer info for requesting document access (marketplace mode) */
	viewer?: {
		id: string;
		name: string;
		email: string;
		avatar?: string;
	};
	/** Access requests for this property (viewer mode) */
	accessRequests?: DocumentAccessRequest[];
	/** Called when a new access request is created */
	onAccessRequested?: (req: DocumentAccessRequest) => void;
}

export default function PropertyDetailContent({
	property,
	onPatch,
	onDocUploaded,
	onDocDeleted,
	layout = "two-col",
	isOwner = true,
	viewer,
	accessRequests = [],
	onAccessRequested,
}: PropertyDetailContentProps) {
	const summaryCol = (
		<div className="w-full max-w-xl space-y-4">
			{/* Property summary */}
			<div className="bg-card border border-border rounded-xl p-5 space-y-5">
				<h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
					Property Summary
				</h2>

				<div>
					<div className="flex items-center gap-2 text-sm text-outline mb-1">
						<MapPin className="w-4 h-4" />
						<span className="font-medium">Address</span>
					</div>
					<div className="text-sm text-on-surface">{property.address}</div>
				</div>

				<div className="border-t border-divider" />

				<div>
					<div className="flex items-center gap-2 text-sm text-outline mb-1">
						<User className="w-4 h-4" />
						<span className="font-medium">Bought From</span>
					</div>
					<EditableInline
						value={property.boughtFrom ?? ""}
						placeholder="Enter seller name"
						onSave={(val) => onPatch({ boughtFrom: val })}
					/>
				</div>

				<div className="border-t border-divider" />

				<div>
					<div className="flex items-center gap-2 text-sm text-outline mb-1">
						<Calendar className="w-4 h-4" />
						<span className="font-medium">Purchase Date</span>
					</div>
					<div className="text-sm text-on-surface font-medium">
						{formatDate(property.purchaseDate)}
					</div>
				</div>

				<div className="border-t border-divider" />

				<div>
					<div className="flex items-center gap-2 text-sm text-outline mb-1">
						<TrendingUp className="w-4 h-4" />
						<span className="font-medium">Purchase Price</span>
					</div>
					<div className="text-xl font-bold text-on-surface">
						{formatCurrency(property.purchasePrice)}
					</div>
				</div>

				<div className="border-t border-divider" />

				<WorthEditor
					currentValue={property.currentValue}
					purchasePrice={property.purchasePrice}
					onSave={(val) => onPatch({ currentValue: val })}
				/>

				<div className="border-t border-divider" />

				<div>
					<div className="flex items-center gap-2 text-sm text-outline mb-1">
						<MapPin className="w-4 h-4" />
						<span className="font-medium">Plot Area</span>
					</div>
					<div className="text-sm text-on-surface font-medium">
						{property.area?.toLocaleString() ?? "—"} sqm
					</div>
				</div>

				{(property.quantity ?? 1) > 1 && (
					<>
						<div className="border-t border-divider" />
						<div>
							<div className="flex items-center gap-2 text-sm text-outline mb-1">
								<Copy className="w-4 h-4" />
								<span className="font-medium">Quantity</span>
							</div>
							<div className="text-sm text-on-surface font-medium">
								{property.quantity} identical units
							</div>
						</div>
					</>
				)}
			</div>

			{/* Land Condition */}
			<ConditionTagEditor
				conditions={property.conditions ?? []}
				onSave={(items) => onPatch({ conditions: items })}
			/>

			{/* Transaction details */}
			<div className="bg-card border border-border rounded-xl p-5 space-y-5">
				<h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
					Transaction Details
				</h2>
				<EditableTagList
					label="Witnesses"
					icon={Users}
					items={property.witnesses ?? []}
					placeholder="Add witness name, press Enter"
					onSave={(items) => onPatch({ witnesses: items })}
				/>
				<div className="border-t border-divider" />
				<EditableTagList
					label="Signatories"
					icon={Edit3}
					items={property.signatures ?? []}
					placeholder="Add signatory name, press Enter"
					onSave={(items) => onPatch({ signatures: items })}
				/>
			</div>

			{/* Survey info */}
			{property.surveyData && (
				<div className="bg-card border border-border rounded-xl p-5 space-y-4">
					<h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
						Survey Information
					</h2>
					<div className="grid grid-cols-2 gap-3">
						{property.surveyData.plotNumber && (
							<InfoItem
								label="Plot Number"
								value={property.surveyData.plotNumber}
							/>
						)}
						{property.surveyData.registrationNumber && (
							<InfoItem
								label="Reg. Number"
								value={property.surveyData.registrationNumber}
							/>
						)}
						{property.surveyData.surveyor && (
							<InfoItem label="Surveyor" value={property.surveyData.surveyor} />
						)}
						{property.surveyData.surveyDate && (
							<InfoItem
								label="Survey Date"
								value={formatDate(property.surveyData.surveyDate)}
							/>
						)}
						<InfoItem
							label="Measured Area"
							value={`${property.surveyData.area?.toLocaleString()} sqm`}
						/>
						<InfoItem
							label="Boundary Points"
							value={String(property.surveyData.coordinates?.length ?? 0)}
						/>
					</div>
				</div>
			)}
		</div>
	);

	const handleAccessLevelChanged = (
		docId: string,
		level: DocumentAccessLevel,
	) => {
		const updatedDocs = (property.documents ?? []).map((d) =>
			d.id === docId ? { ...d, accessLevel: level } : d,
		);
		onPatch({ documents: updatedDocs });
	};

	const handleDocTypeChanged = async (docId: string, newType: DocumentType) => {
		try {
			const res = await fetch(
				`${API_BASE}/properties/${property.id}/documents`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ docId, type: newType }),
				},
			);
			if (res.ok) {
				const updatedDocs = (property.documents ?? []).map((d) =>
					d.id === docId ? { ...d, type: newType } : d,
				);
				onPatch({ documents: updatedDocs });
			}
		} catch {
			/* silent */
		}
	};

	const docCount = property.documents?.length ?? 0;
	const showDocsSection = docCount > 0 || isOwner;

	const docsCol = showDocsSection ? (
		<div className="w-full space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-on-surface dark:text-on-surface uppercase tracking-wide">
					Documents
				</h2>
				{docCount > 0 && (
					<span className="text-xs text-outline dark:text-on-surface-variant">
						{docCount} file{docCount !== 1 ? "s" : ""} total
					</span>
				)}
			</div>
			{isOwner && (
				<AccessRequestManager
					propertyId={property.id}
					ownerId={property.owner.id}
					documents={property.documents ?? []}
				/>
			)}
			<DocumentsGrid
				documents={property.documents ?? []}
				propertyId={property.id}
				onUploaded={onDocUploaded}
				onDeleted={onDocDeleted}
				onTypeChanged={handleDocTypeChanged}
				isOwner={isOwner}
				onAccessLevelChanged={handleAccessLevelChanged}
				viewerId={viewer?.id}
				viewerName={viewer?.name}
				viewerEmail={viewer?.email}
				viewerAvatar={viewer?.avatar}
				accessRequests={accessRequests}
				onAccessRequested={onAccessRequested}
			/>
		</div>
	) : null;

	const hasCoordinates =
		property.coordinates &&
		(property.coordinates.lat !== 0 || property.coordinates.lng !== 0);

	const miniMapCol = hasCoordinates ? (
		<PropertyMiniMap
			lat={property.coordinates.lat}
			lng={property.coordinates.lng}
			propertyName={property.name}
			mapHref="/portfolio/map"
		/>
	) : null;

	if (layout === "stack") {
		return (
			<div className="flex items-start justify-start gap-6">
				<div className="flex-1 min-w-0 space-y-4">
					{summaryCol}
					{miniMapCol}
				</div>
				{docsCol && <div className="w-80 shrink-0">{docsCol}</div>}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-start justify-start gap-6">
			{summaryCol}
			{miniMapCol}
			{docsCol}
		</div>
	);
}
