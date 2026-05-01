"use client";

import { queryKeys } from "@/hooks/usePropertyQueries";
import { useQueryClient } from "@tanstack/react-query";

import FileUploader from "@/components/ui/FileUploader";
import UnifiedMediaViewer from "@/components/ui/UnifiedMediaViewer";
import { invalidateCachedGet } from "@/lib/clientCache";
import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentAccessRequest,
	DocumentType,
	PropertyDocument,
	PropertyStatus,
} from "@/types/property";
import { WatermarkConfig, WatermarkType } from "@/types/seal";
import {
	Droplets,
	Eye,
	FileText,
	MoreVertical,
	Trash2,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	DocumentAccessLevelPicker,
	RestrictedDocumentRow,
} from "./DocumentAccessControl";

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
		case PropertyStatus.FOR_RENT:
			return "bg-teal-100 text-teal-700 border-teal-200";
		case PropertyStatus.FOR_LEASE:
			return "bg-cyan-100 text-cyan-700 border-cyan-200";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-100 text-orange-700 border-orange-200";
		case PropertyStatus.RENTED:
			return "bg-purple-100 text-purple-700 border-purple-200";
		case PropertyStatus.LEASED:
			return "bg-indigo-100 text-indigo-700 border-indigo-200";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-100 text-yellow-700 border-yellow-200";
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
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-badge font-medium px-1.5 py-0.5 rounded">
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
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
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
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-slate-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
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
	doc: PropertyDocument;
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
	const queryClient = useQueryClient();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const [classifyOpen, setClassifyOpen] = useState(false);
	const [classifyDraft, setClassifyDraft] = useState<DocumentType>(doc.type);
	const [watermarkOpen, setWatermarkOpen] = useState(false);
	const [watermarkState, setWatermarkState] = useState<
		WatermarkConfig | undefined
	>((doc as { watermark?: WatermarkConfig }).watermark);
	const [watermarkDraft, setWatermarkDraft] = useState<WatermarkConfig>(
		(doc as { watermark?: WatermarkConfig }).watermark ?? {
			type: WatermarkType.PLATFORM,
			position: "bottom-right",
			opacity: 0.15,
		},
	);
	const [savingWatermark, setSavingWatermark] = useState(false);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		}
		if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [menuOpen]);

	useEffect(() => {
		setClassifyDraft(doc.type);
	}, [doc.type]);

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

	async function handleSaveWatermark() {
		setSavingWatermark(true);
		try {
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ docId: doc.id, watermark: watermarkDraft }),
				},
			);
			if (!res.ok) throw new Error("Failed to save watermark");
			setWatermarkState(watermarkDraft);
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(propertyId),
			});
			setWatermarkOpen(false);
		} catch {
			/* silent */
		} finally {
			setSavingWatermark(false);
		}
	}

	async function handleClearWatermark() {
		setSavingWatermark(true);
		try {
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ docId: doc.id, watermark: null }),
				},
			);
			if (!res.ok) throw new Error("Failed to clear watermark");
			setWatermarkState(undefined);
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(propertyId),
			});
			setWatermarkOpen(false);
		} catch {
			/* silent */
		} finally {
			setSavingWatermark(false);
		}
	}

	const hasWatermark = !!watermarkState;

	function handleSaveClassification() {
		onTypeChanged(doc.id, classifyDraft);
		setClassifyOpen(false);
	}

	return (
		<div className="w-44 flex flex-col rounded-xl bg-card border border-border group relative shrink-0 hover:shadow-md transition-all">
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
						{/* ⋮ context menu */}
						<div className="relative" ref={menuRef}>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								}}
								className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-surface-container-high transition-colors"
								title="More options"
							>
								<MoreVertical className="w-3 h-3" />
							</button>
							{menuOpen && (
								<div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-40 py-1 w-44 animate-in fade-in zoom-in-95 duration-150">
									<button
										type="button"
										onClick={() => {
											setMenuOpen(false);
											setWatermarkOpen((v) => !v);
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
									>
										<Droplets className="w-3.5 h-3.5 shrink-0" />
										{hasWatermark ? "Edit Watermark" : "Add Watermark"}
									</button>
									<button
										type="button"
										onClick={() => {
											setMenuOpen(false);
											setClassifyOpen((v) => !v);
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
									>
										<FileText className="w-3.5 h-3.5 shrink-0" />
										Classify Document
									</button>
									<div className="my-0.5 border-t border-border" />
									<button
										type="button"
										onClick={() => {
											setMenuOpen(false);
											handleDelete(doc.id);
										}}
										className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
									>
										<Trash2 className="w-3.5 h-3.5 shrink-0" />
										Delete
									</button>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Watermark indicator badge */}
			{hasWatermark && (
				<div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-blue-600/80 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded pointer-events-none">
					<Droplets className="w-2.5 h-2.5" />
					WM
				</div>
			)}

			{/* Inline classification panel */}
			{classifyOpen && isOwner && (
				<div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-md shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
					<p className="text-[11px] font-semibold text-on-surface mb-2 font-headline uppercase tracking-wider flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5 text-primary" />
						Classify Document
					</p>
					<label className="block text-badge text-on-surface-variant mb-1">
						Type
					</label>
					<select
						value={classifyDraft}
						onChange={(e) => setClassifyDraft(e.target.value as DocumentType)}
						className="w-full text-[11px] bg-surface-container border border-border rounded-md px-2 py-1 text-on-surface mb-3 focus:outline-none"
					>
						{DOCUMENT_CATEGORIES.map((cat) => (
							<option key={cat.type} value={cat.type}>
								{cat.label}
							</option>
						))}
					</select>
					<div className="flex gap-1.5">
						<button
							type="button"
							onClick={handleSaveClassification}
							className="flex-1 text-badge font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1.5 transition-colors"
						>
							Save
						</button>
						<button
							type="button"
							onClick={() => {
								setClassifyDraft(doc.type);
								setClassifyOpen(false);
							}}
							className="text-badge font-medium text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-md hover:bg-surface-container transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Inline watermark config panel */}
			{watermarkOpen && isOwner && (
				<div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-md shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
					<p className="text-[11px] font-semibold text-on-surface mb-2 font-headline uppercase tracking-wider flex items-center gap-1.5">
						<Droplets className="w-3.5 h-3.5 text-blue-500" />
						Watermark
					</p>

					{/* Type */}
					<label className="block text-badge text-on-surface-variant mb-1">
						Type
					</label>
					<select
						value={watermarkDraft.type}
						onChange={(e) =>
							setWatermarkDraft((d) => ({
								...d,
								type: e.target.value as WatermarkType,
							}))
						}
						className="w-full text-[11px] bg-surface-container border border-border rounded-md px-2 py-1 text-on-surface mb-2 focus:outline-none"
					>
						<option value={WatermarkType.PLATFORM}>Plotfolio branding</option>
						<option value={WatermarkType.TEXT}>Custom text</option>
						<option value={WatermarkType.SEAL}>My seal</option>
					</select>

					{/* Text input if type=TEXT */}
					{watermarkDraft.type === WatermarkType.TEXT && (
						<>
							<label className="block text-badge text-on-surface-variant mb-1">
								Text
							</label>
							<input
								type="text"
								value={watermarkDraft.text ?? ""}
								onChange={(e) =>
									setWatermarkDraft((d) => ({ ...d, text: e.target.value }))
								}
								placeholder="e.g. CONFIDENTIAL"
								className="w-full text-[11px] bg-surface-container border border-border rounded-md px-2 py-1 text-on-surface mb-2 focus:outline-none"
							/>
						</>
					)}

					{/* Position */}
					<label className="block text-badge text-on-surface-variant mb-1">
						Position
					</label>
					<select
						value={watermarkDraft.position ?? "bottom-right"}
						onChange={(e) =>
							setWatermarkDraft((d) => ({
								...d,
								position: e.target.value as WatermarkConfig["position"],
							}))
						}
						className="w-full text-[11px] bg-surface-container border border-border rounded-md px-2 py-1 text-on-surface mb-2 focus:outline-none"
					>
						<option value="bottom-right">Bottom right</option>
						<option value="bottom-left">Bottom left</option>
						<option value="center">Center</option>
						<option value="tiled">Tiled</option>
					</select>

					{/* Opacity */}
					<label className="block text-badge text-on-surface-variant mb-1">
						Opacity — {Math.round((watermarkDraft.opacity ?? 0.15) * 100)}%
					</label>
					<input
						type="range"
						min={5}
						max={60}
						step={5}
						value={Math.round((watermarkDraft.opacity ?? 0.15) * 100)}
						onChange={(e) =>
							setWatermarkDraft((d) => ({
								...d,
								opacity: Number(e.target.value) / 100,
							}))
						}
						className="w-full mb-3 accent-blue-600"
					/>

					<div className="flex gap-1.5">
						<button
							type="button"
							disabled={savingWatermark}
							onClick={handleSaveWatermark}
							className="flex-1 text-badge font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1.5 transition-colors disabled:opacity-50"
						>
							{savingWatermark ? "Saving…" : "Save"}
						</button>
						{hasWatermark && (
							<button
								type="button"
								disabled={savingWatermark}
								onClick={handleClearWatermark}
								className="text-badge font-medium text-red-500 hover:text-red-600 px-2 py-1.5 rounded-md hover:bg-surface-container transition-colors"
							>
								Clear
							</button>
						)}
						<button
							type="button"
							onClick={() => setWatermarkOpen(false)}
							className="text-badge font-medium text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-md hover:bg-surface-container transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Info row */}
			<div className="px-2.5 py-2">
				<p
					className="text-[11px] font-medium text-on-surface truncate font-body leading-tight"
					title={doc.name}
				>
					{doc.name}
				</p>
				<p className="text-badge text-on-surface-variant mt-0.5 font-body">
					{extensionLabel} &middot;{" "}
					{new Date(doc.uploadDate).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</p>
			</div>

			{/* Type at bottom */}
			<div className="px-2.5 pb-2 mt-auto">
				<span
					className="inline-flex text-badge uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant truncate max-w-full"
					title={getDocumentTypeLabel(doc.type)}
				>
					{getDocumentTypeLabel(doc.type)}
				</span>
			</div>
		</div>
	);
}

// ----- Pending upload types and placeholder card -----

interface PendingDoc {
	id: number;
	file: File;
	status: "uploading" | "failed";
	error?: string;
}

function getFilePendingKind(file: File): "image" | "pdf" | "document" {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (IMAGE_EXTENSIONS.has(ext)) return "image";
	if (ext === "pdf") return "pdf";
	return "document";
}

function LocalImageThumbnail({ file }: { file: File }) {
	const [src] = useState(() => URL.createObjectURL(file));
	return (
		<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-surface-container">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={src}
				alt={file.name}
				className="w-full h-full object-cover opacity-60"
			/>
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-badge font-medium px-1.5 py-0.5 rounded">
				IMG
			</span>
		</div>
	);
}

function DocUploadPlaceholder({
	item,
	onRetry,
	onDismiss,
}: {
	item: PendingDoc;
	onRetry: () => void;
	onDismiss: () => void;
}) {
	const kind = getFilePendingKind(item.file);
	const extLabel = item.file.name.split(".").pop()?.toUpperCase() ?? "FILE";
	return (
		<div className="w-32 shrink-0 rounded-xl overflow-hidden border border-border bg-card">
			{kind === "image" ? (
				<LocalImageThumbnail file={item.file} />
			) : kind === "pdf" ? (
				<RemotePdfThumbnail />
			) : (
				<RemoteGenericThumbnail extensionLabel={extLabel} />
			)}
			<div className="px-2.5 py-2">
				<p className="text-[11px] font-medium text-on-surface truncate font-body leading-tight">
					{item.file.name}
				</p>
				{item.status === "uploading" ? (
					<div className="flex items-center gap-1.5 mt-1.5">
						<div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
							<div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
						</div>
						<button
							type="button"
							onClick={onDismiss}
							className="text-[9px] text-red-500 hover:text-red-600 font-medium shrink-0"
						>
							Cancel
						</button>
					</div>
				) : (
					<>
						<p className="text-[9px] text-red-500 leading-tight mt-0.5 truncate">
							{item.error}
						</p>
						<div className="flex items-center gap-2 mt-1">
							<button
								type="button"
								onClick={onRetry}
								className="text-[9px] text-primary font-medium hover:underline flex items-center gap-0.5 shrink-0"
							>
								<Upload className="w-2.5 h-2.5" />
								Retry
							</button>
							<button
								type="button"
								onClick={onDismiss}
								className="text-[9px] text-outline hover:text-on-surface-variant shrink-0"
							>
								Dismiss
							</button>
						</div>
					</>
				)}
			</div>
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
	documents: PropertyDocument[];
	propertyId: string;
	onUploaded: (doc: PropertyDocument) => void;
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
	const queryClient = useQueryClient();
	const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
	const pendingIdRef = useRef(0);
	const hasDocuments = documents.length > 0;
	const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null);
	const showEmptyUpload = isOwner && !hasDocuments && pendingDocs.length === 0;

	if (!hasDocuments && !isOwner && pendingDocs.length === 0) return null;

	async function uploadDoc(id: number, file: File) {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", DocumentType.OTHER);
			formData.append("name", file.name);
			const res = await fetch(
				`${API_BASE}/properties/${propertyId}/documents`,
				{
					method: "POST",
					body: formData,
				},
			);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Upload failed");
			}
			const { document } = await res.json();
			onUploaded(document);
			setPendingDocs((prev) => prev.filter((p) => p.id !== id));
			invalidateCachedGet(`/api/properties/${propertyId}`);
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(propertyId),
			});
		} catch (err) {
			const error = err instanceof Error ? err.message : "Upload failed";
			setPendingDocs((prev) =>
				prev.map((p) => (p.id === id ? { ...p, status: "failed", error } : p)),
			);
		}
	}

	function handleFilesPicked(files: File[]) {
		for (const file of files) {
			const id = ++pendingIdRef.current;
			setPendingDocs((prev) => [...prev, { id, file, status: "uploading" }]);
			uploadDoc(id, file);
		}
	}

	return (
		<>
			{previewDoc && (
				<UnifiedMediaViewer
					source={{
						url: getDocViewUrl(propertyId, previewDoc.id),
						name: previewDoc.name,
						size: previewDoc.size,
					}}
					onClose={() => setPreviewDoc(null)}
				/>
			)}
			{showEmptyUpload ? (
				<FileUploader
					onFiles={handleFilesPicked}
					empty
					emptyLabel="Drag & drop documents here"
				/>
			) : (
				<div className="flex flex-wrap gap-3 items-start">
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
					{/* Upload placeholders — one card per pending file */}
					{pendingDocs.map((item) => (
						<DocUploadPlaceholder
							key={item.id}
							item={item}
							onRetry={() => {
								setPendingDocs((prev) =>
									prev.map((p) =>
										p.id === item.id
											? { ...p, status: "uploading", error: undefined }
											: p,
									),
								);
								uploadDoc(item.id, item.file);
							}}
							onDismiss={() =>
								setPendingDocs((prev) => prev.filter((p) => p.id !== item.id))
							}
						/>
					))}
					{isOwner && <FileUploader onFiles={handleFilesPicked} />}
				</div>
			)}
		</>
	);
}
