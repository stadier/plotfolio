"use client";

import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentAccessRequest,
	DocumentType,
	Property,
	PropertyStatus,
} from "@/types/property";
import {
	Check,
	ChevronDown,
	Eye,
	FileText,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	DocumentAccessLevelPicker,
	RestrictedDocumentRow,
} from "./DocumentAccessControl";
import DocumentPreview from "./DocumentPreview";

const API_BASE = "/api";

import { formatCurrency } from "@/lib/utils";
export { formatCurrency };

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

function getDocViewUrl(propertyId: string, docId: string): string {
	return `/api/properties/${propertyId}/documents/${docId}/view`;
}

// ----- URL-based thumbnails (matching DocumentSidebar design) -----

function RemoteImageThumbnail({ url, name }: { url: string; name: string }) {
	return (
		<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-surface-container">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={url} alt={name} className="w-full h-full object-cover" />
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
				IMG
			</span>
		</div>
	);
}

function RemotePdfThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-card border-b border-border">
			<div className="p-3 pt-4 flex flex-col gap-1.5">
				<div className="h-1.5 w-3/4 rounded-full bg-slate-200" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-5/6 rounded-full bg-slate-100" />
				<div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
			</div>
			<div className="absolute top-0 right-0 w-5 h-5">
				<div className="absolute top-0 right-0 w-0 h-0 border-t-20 border-t-slate-100 border-l-20 border-l-transparent" />
				<div className="absolute top-0 right-0 w-0 h-0 border-b-20 border-b-slate-200/60 border-l-20 border-l-transparent" />
			</div>
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
				<FileText className="w-2.5 h-2.5" />
				PDF
			</span>
		</div>
	);
}

function RemoteGenericThumbnail({
	extensionLabel,
}: {
	extensionLabel: string;
}) {
	return (
		<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-card border-b border-border">
			<div className="p-3 pt-4 flex flex-col gap-1.5">
				<div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
				<div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
			</div>
			<div className="absolute top-0 right-0 w-5 h-5">
				<div className="absolute top-0 right-0 w-0 h-0 border-t-20 border-t-slate-100 border-l-20 border-l-transparent" />
				<div className="absolute top-0 right-0 w-0 h-0 border-b-20 border-b-slate-300/60 border-l-20 border-l-transparent" />
			</div>
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-slate-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
				<FileText className="w-2.5 h-2.5" />
				{extensionLabel}
			</span>
		</div>
	);
}

// ----- Document card (rich thumbnail style) -----
function DocumentCard({
	doc,
	propertyId,
	isOwner,
	onDeleted,
	onTypeChanged,
	onAccessLevelChanged,
	onPreview,
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
	onPreview: () => void;
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
	const viewUrl = getDocViewUrl(propertyId, doc.id);
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
		<div className="w-44 flex flex-col rounded-xl bg-card group relative shrink-0 hover:shadow-md transition-all">
			{/* Rich thumbnail */}
			<div className="rounded-t-xl overflow-hidden">
				{kind === "image" ? (
					<RemoteImageThumbnail url={viewUrl} name={doc.name} />
				) : kind === "pdf" ? (
					<RemotePdfThumbnail />
				) : (
					<RemoteGenericThumbnail extensionLabel={extensionLabel} />
				)}
			</div>

			{/* Hover actions */}
			<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
				<button
					type="button"
					onClick={onPreview}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
					title="View"
				>
					<Eye className="w-3 h-3" />
				</button>
				{isOwner && (
					<>
						<DocumentAccessLevelPicker
							docId={doc.id}
							propertyId={propertyId}
							currentLevel={accessLevel}
							onChanged={(docId, level) => onAccessLevelChanged?.(docId, level)}
						/>
						<button
							onClick={() => handleDelete(doc.id)}
							className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
							title="Delete"
						>
							<Trash2 className="w-3 h-3" />
						</button>
					</>
				)}
			</div>

			{/* Info row */}
			<div className="px-2.5 py-2">
				<p
					className="text-[11px] font-medium text-on-surface truncate font-body leading-tight"
					title={doc.name}
				>
					{doc.name}
				</p>
				<p className="text-[10px] text-on-surface-variant mt-0.5 font-body">
					{extensionLabel} &middot;{" "}
					{new Date(doc.uploadDate).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</p>
			</div>

			{/* Type at bottom — clickable to change */}
			<div className="px-2.5 pb-2 mt-auto relative" ref={typeRef}>
				<button
					onClick={() => isOwner && setTypeOpen(!typeOpen)}
					className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant truncate max-w-full ${isOwner ? "hover:bg-surface-container-highest cursor-pointer" : ""}`}
					title={
						isOwner ? "Click to change type" : getDocumentTypeLabel(doc.type)
					}
				>
					{getDocumentTypeLabel(doc.type)}
				</button>
				{typeOpen && (
					<div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg z-30 py-1 w-48">
						{DOCUMENT_CATEGORIES.map((cat) => (
							<button
								key={cat.type}
								onClick={() => {
									onTypeChanged(doc.id, cat.type);
									setTypeOpen(false);
								}}
								className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container ${doc.type === cat.type ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}
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
	const [failedFile, setFailedFile] = useState<File | null>(null);
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

	async function uploadFile(file: File) {
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
			setFailedFile(null);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : "Upload failed");
			setFailedFile(file);
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setFailedFile(null);
		await uploadFile(file);
	}

	function handleRetry() {
		if (failedFile) uploadFile(failedFile);
	}

	function handleDismiss() {
		setFailedFile(null);
		setUploadError(null);
	}

	return (
		<div className="w-32 shrink-0 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-surface-container/50 dark:bg-surface-container/50 hover:bg-surface-container-high dark:hover:bg-surface-container transition-colors">
			{/* Type selector */}
			<div className="relative mt-3 px-2 w-full" ref={dropdownRef}>
				<button
					onClick={() => setTypeOpen(!typeOpen)}
					className="w-full flex items-center justify-center gap-1 text-[10px] text-outline dark:text-on-surface-variant hover:text-on-surface-variant dark:hover:text-on-surface uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-card border border-border"
				>
					<span className="truncate">{getDocumentTypeLabel(selectedType)}</span>
					<ChevronDown className="w-3 h-3 shrink-0" />
				</button>
				{typeOpen && (
					<div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-30 py-1 w-48">
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
			) : failedFile && uploadError ? (
				<div className="flex-1 flex flex-col items-center justify-center py-4 w-full gap-1.5 px-2">
					<Upload className="w-5 h-5 text-red-400" />
					<p
						className="text-[10px] text-on-surface font-medium text-center truncate w-full"
						title={failedFile.name}
					>
						{failedFile.name}
					</p>
					<p className="text-[9px] text-red-500 text-center leading-tight">
						{uploadError}
					</p>
					<button
						onClick={handleRetry}
						disabled={uploading}
						className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline mt-0.5"
					>
						<Upload className="w-3 h-3" />
						{uploading ? "Retrying…" : "Retry"}
					</button>
					<button
						onClick={handleDismiss}
						className="text-[9px] text-outline hover:text-on-surface-variant"
					>
						Dismiss
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
	const [previewDoc, setPreviewDoc] = useState<Property["documents"][0] | null>(
		null,
	);
	if (!hasDocuments && !isOwner) return null;

	return (
		<>
			{previewDoc && (
				<DocumentPreview
					remoteUrl={getDocViewUrl(propertyId, previewDoc.id)}
					remoteName={previewDoc.name}
					remoteSize={previewDoc.size}
					onClose={() => setPreviewDoc(null)}
				/>
			)}
			<div className="flex flex-wrap gap-3 items-start">
				{isOwner && (
					<DocumentUploadButton
						propertyId={propertyId}
						onUploaded={onUploaded}
					/>
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
						onPreview={() => setPreviewDoc(doc)}
						viewerId={viewerId}
						viewerName={viewerName}
						viewerEmail={viewerEmail}
						viewerAvatar={viewerAvatar}
						accessRequests={accessRequests}
						onAccessRequested={onAccessRequested}
					/>
				))}
			</div>
		</>
	);
}

