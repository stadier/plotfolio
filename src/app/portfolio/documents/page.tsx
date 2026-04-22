"use client";

import { useRequireAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { usePortfolio } from "@/components/PortfolioContext";
import SummaryStatCard from "@/components/property/SummaryStatCard";
import MasonryGrid from "@/components/ui/MasonryGrid";
import PrimaryButton from "@/components/ui/PrimaryButton";
import useAnimateOnce from "@/hooks/useAnimateOnce";
import { PropertyAPI } from "@/lib/api";
import { AIDocument, AIDocumentType } from "@/types/document";
import { Property } from "@/types/property";
import type { LetterheadConfig } from "@/types/seal";
import {
	ArrowUpDown,
	Bold,
	Bookmark,
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	FileText,
	HardDrive,
	Heading1,
	Heading2,
	Italic,
	LayoutGrid,
	Link2,
	List as ListIcon,
	ListOrdered,
	Minus,
	PenLine,
	Plus,
	Printer,
	Search,
	Stamp,
	Trash2,
	Underline,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	survey_plan: "Survey Plan",
	certificate_of_occupancy: "Certificate of Occupancy",
	contract_of_sale: "Contract of Sale",
	title_deed: "Title Deed",
	lease_agreement: "Lease Agreement",
	building_permit: "Building Permit",
	inspection_report: "Inspection Report",
	allocation_letter: "Allocation Letter",
	other: "Other",
};

const ITEMS_PER_PAGE = 12;

function getDocTypeLabel(type: string): string {
	return (
		DOCUMENT_TYPE_LABELS[type] ??
		type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date): string {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function getFileKind(
	mimeType: string,
	fileName: string,
): "image" | "pdf" | "html" | "document" {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
	if (
		mimeType === "text/html" ||
		fileName.endsWith(".html") ||
		fileName.endsWith(".htm")
	)
		return "html";
	return "document";
}

// ── Document Card ──────────────────────────────────────────────────────────

function DocumentThumbnail({
	doc,
	kind,
}: {
	doc: AIDocument;
	kind: "image" | "pdf" | "html" | "document";
}) {
	if (kind === "image") {
		return (
			<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-surface-container">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={doc.fileUrl}
					alt={doc.fileName}
					className="w-full h-full object-cover"
				/>
				<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-badge font-medium px-1.5 py-0.5 rounded">
					IMG
				</span>
			</div>
		);
	}

	if (kind === "pdf") {
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
				<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
					<FileText className="w-2.5 h-2.5" />
					PDF
				</span>
			</div>
		);
	}

	if (kind === "html") {
		return (
			<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-card border-b border-border">
				<div className="p-3 pt-4 flex flex-col gap-1.5">
					<div className="h-2 w-1/3 rounded-full bg-blue-200" />
					<div className="h-1.5 w-full rounded-full bg-slate-100" />
					<div className="h-1.5 w-5/6 rounded-full bg-slate-100" />
					<div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
					<div className="h-1.5 w-full rounded-full bg-slate-100" />
				</div>
				<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-orange-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
					<FileText className="w-2.5 h-2.5" />
					HTML
				</span>
			</div>
		);
	}

	const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
	return (
		<div className="relative w-full aspect-4/3 rounded-t-xl overflow-hidden bg-card border-b border-border">
			<div className="p-3 pt-4 flex flex-col gap-1.5">
				<div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
				<div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
			</div>
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-slate-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
				<FileText className="w-2.5 h-2.5" />
				{ext.slice(0, 5)}
			</span>
		</div>
	);
}

function AIDocumentCard({
	doc,
	propertyNames,
	onPreview,
	onDelete,
	onLinkProperties,
	properties,
}: {
	doc: AIDocument;
	propertyNames?: string[];
	onPreview: () => void;
	onDelete: () => void;
	onLinkProperties: (propertyIds: string[]) => void;
	properties: Property[];
}) {
	const kind = getFileKind(doc.mimeType, doc.fileName);

	return (
		<div className="w-full max-w-xs flex flex-col rounded-xl bg-card border border-border group relative hover:shadow-md transition-all">
			<DocumentThumbnail doc={doc} kind={kind} />

			{/* Hover actions */}
			<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
				<button
					type="button"
					onClick={onPreview}
					className="w-6 h-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
					title="View"
				>
					<Eye className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={onDelete}
					className="w-6 h-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
					title="Delete"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* Info */}
			<div className="px-3 py-2.5 flex flex-col gap-1">
				<p
					className="text-xs font-medium text-on-surface truncate"
					title={doc.fileName}
				>
					{doc.fileName}
				</p>
				<div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
					<span>{formatFileSize(doc.fileSize)}</span>
					<span className="text-outline">&middot;</span>
					<span>{formatDate(doc.createdAt)}</span>
				</div>
				<div className="mt-0.5">
					{propertyNames && propertyNames.length > 0 ? (
						<div className="flex flex-wrap gap-1">
							{propertyNames.map((name, i) => (
								<span
									key={i}
									className="inline-flex items-center gap-0.5 text-badge text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-md"
								>
									<Link2 className="w-2.5 h-2.5 shrink-0" />
									<span className="truncate max-w-[100px]">{name}</span>
								</span>
							))}
						</div>
					) : (
						<span className="text-badge text-outline">
							No properties linked
						</span>
					)}
					<details className="mt-1 group/details">
						<summary className="text-badge text-primary cursor-pointer select-none hover:underline">
							Edit links
						</summary>
						<div className="mt-1 max-h-28 overflow-y-auto space-y-0.5">
							{properties.map((p) => (
								<label
									key={p.id}
									className="flex items-center gap-1.5 text-[11px] text-on-surface-variant cursor-pointer hover:text-on-surface py-0.5"
								>
									<input
										type="checkbox"
										checked={doc.propertyIds?.includes(p.id) ?? false}
										onChange={(e) => {
											const current = doc.propertyIds ?? [];
											const next = e.target.checked
												? [...current, p.id]
												: current.filter((id) => id !== p.id);
											onLinkProperties(next);
										}}
										className="rounded border-border text-primary focus:ring-primary/20 w-3 h-3"
									/>
									<span className="truncate">{p.name}</span>
								</label>
							))}
						</div>
					</details>
				</div>
				{doc.confidence != null && (
					<div className="flex items-center gap-1 text-badge text-outline mt-0.5">
						AI confidence: {(doc.confidence * 100).toFixed(0)}%
					</div>
				)}
			</div>

			{/* Type badge */}
			<div className="px-3 pb-2.5 mt-auto">
				<span className="text-badge uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
					{getDocTypeLabel(doc.documentType)}
				</span>
			</div>
		</div>
	);
}

// ── Upload Modal ───────────────────────────────────────────────────────────

function UploadDocumentModal({
	userId,
	properties,
	onClose,
	onUploaded,
}: {
	userId: string;
	properties: Property[];
	onClose: () => void;
	onUploaded: (doc: AIDocument) => void;
}) {
	const [file, setFile] = useState<File | null>(null);
	const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
	const [documentType, setDocumentType] = useState<AIDocumentType>(
		AIDocumentType.OTHER,
	);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	async function handleUpload() {
		if (!file) return;
		setUploading(true);
		setError(null);
		try {
			const result = await PropertyAPI.uploadDocument(file, userId, {
				propertyIds: selectedPropertyIds.length
					? selectedPropertyIds
					: undefined,
				documentType,
			});
			if (!result) throw new Error("Upload failed");
			onUploaded(result.document);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const dropped = e.dataTransfer.files[0];
		if (dropped) setFile(dropped);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-bold text-on-surface">Upload Document</h2>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Drop zone */}
				<div
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={handleDrop}
					className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
						dragOver
							? "border-primary bg-primary/5"
							: "border-border hover:border-primary/40"
					}`}
				>
					{file ? (
						<div className="flex flex-col items-center gap-2">
							<FileText className="w-8 h-8 text-primary" />
							<p className="text-sm font-medium text-on-surface">{file.name}</p>
							<p className="text-xs text-outline">
								{formatFileSize(file.size)}
							</p>
							<button
								onClick={() => setFile(null)}
								className="text-xs text-red-500 hover:underline"
							>
								Remove
							</button>
						</div>
					) : (
						<label className="flex flex-col items-center gap-2 cursor-pointer">
							<Upload className="w-8 h-8 text-outline" />
							<p className="text-sm text-on-surface-variant">
								Drag & drop a file here, or{" "}
								<span className="text-primary font-medium">browse</span>
							</p>
							<p className="text-xs text-outline">
								PDF, JPEG, PNG, WebP — Max 25 MB
							</p>
							<input
								type="file"
								accept=".pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) setFile(f);
								}}
							/>
						</label>
					)}
				</div>

				{/* Document type */}
				<div className="mb-4">
					<label className="block text-xs font-medium text-on-surface-variant mb-1.5">
						Document Type
					</label>
					<div className="relative">
						<select
							value={documentType}
							onChange={(e) =>
								setDocumentType(e.target.value as AIDocumentType)
							}
							className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
						>
							{Object.values(AIDocumentType).map((t) => (
								<option key={t} value={t}>
									{getDocTypeLabel(t)}
								</option>
							))}
						</select>
						<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
					</div>
				</div>

				{/* Associate with properties */}
				<div className="mb-5">
					<label className="block text-xs font-medium text-on-surface-variant mb-1.5">
						Associate with Properties{" "}
						<span className="text-outline">(optional)</span>
					</label>
					<div className="max-h-36 overflow-y-auto border border-border rounded-md bg-card p-2 space-y-1">
						{properties.length === 0 ? (
							<p className="text-xs text-outline py-1">
								No properties available
							</p>
						) : (
							properties.map((p) => (
								<label
									key={p.id}
									className="flex items-center gap-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-high rounded px-1 py-0.5"
								>
									<input
										type="checkbox"
										checked={selectedPropertyIds.includes(p.id)}
										onChange={(e) => {
											setSelectedPropertyIds((prev) =>
												e.target.checked
													? [...prev, p.id]
													: prev.filter((id) => id !== p.id),
											);
										}}
										className="rounded border-border text-primary focus:ring-primary/20"
									/>
									<span className="truncate">{p.name}</span>
								</label>
							))
						)}
					</div>
				</div>

				{error && <p className="text-sm text-red-500 mb-4">{error}</p>}

				<div className="flex items-center justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
					>
						Cancel
					</button>
					<PrimaryButton onClick={handleUpload} disabled={!file || uploading}>
						{uploading ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Uploading…
							</>
						) : (
							<>
								<Upload className="w-4 h-4" />
								Upload
							</>
						)}
					</PrimaryButton>
				</div>
			</div>
		</div>
	);
}

// ── Document Preview Modal ─────────────────────────────────────────────────

function DocumentPreviewModal({
	doc,
	onClose,
}: {
	doc: AIDocument;
	onClose: () => void;
}) {
	const kind = getFileKind(doc.mimeType, doc.fileName);
	const viewUrl = `/api/documents/${doc.id}/view`;
	const [exportOpen, setExportOpen] = useState(false);
	const [htmlContent, setHtmlContent] = useState<string | null>(null);

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);

	// Preload HTML content for export when possible (can fail on cross-origin URLs).
	useEffect(() => {
		if (kind !== "html") return;
		fetch(viewUrl)
			.then((r) => r.text())
			.then(setHtmlContent)
			.catch(() => setHtmlContent(null));
	}, [kind, viewUrl]);

	async function readHtmlContent(): Promise<string | null> {
		if (htmlContent) return htmlContent;
		try {
			return await fetch(viewUrl).then((r) => r.text());
		} catch {
			return null;
		}
	}

	function stripBaseName(name: string) {
		return name.replace(/\.[^.]+$/, "");
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = Object.assign(document.createElement("a"), {
			href: url,
			download: filename,
		});
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	async function exportAs(format: "txt" | "pdf" | "html") {
		const base = stripBaseName(doc.fileName);

		try {
			if (format === "txt") {
				// Extract text: use ocrText if available, else strip HTML tags, else just download
				let text = doc.ocrText ?? "";
				if (!text && htmlContent) {
					const tmp = document.createElement("div");
					tmp.innerHTML = htmlContent;
					text = tmp.textContent ?? tmp.innerText ?? "";
				}
				if (!text) {
					// Fetch original and strip (if accessible)
					const raw = await readHtmlContent();
					if (raw) {
						const tmp = document.createElement("div");
						tmp.innerHTML = raw;
						text = tmp.textContent ?? tmp.innerText ?? raw;
					}
				}
				if (!text) {
					window.open(viewUrl, "_blank", "noopener,noreferrer");
					setExportOpen(false);
					return;
				}
				downloadBlob(new Blob([text], { type: "text/plain" }), `${base}.txt`);
			} else if (format === "pdf") {
				// Open a print-friendly window for browser PDF export
				const content = await readHtmlContent();
				if (!content) {
					window.open(viewUrl, "_blank", "noopener,noreferrer");
					setExportOpen(false);
					return;
				}
				const w = window.open("", "_blank");
				if (w) {
					w.document.write(content);
					w.document.close();
					w.focus();
					w.print();
				}
			} else if (format === "html") {
				const content = await readHtmlContent();
				if (!content) {
					window.open(viewUrl, "_blank", "noopener,noreferrer");
					setExportOpen(false);
					return;
				}
				downloadBlob(
					new Blob([content], { type: "text/html" }),
					`${base}.html`,
				);
			}
		} catch (error) {
			console.error("[documents] export failed", error);
			window.open(viewUrl, "_blank", "noopener,noreferrer");
		} finally {
			setExportOpen(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="bg-card border border-border rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-5 py-3 border-b border-border">
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-semibold text-on-surface truncate">
							{doc.fileName}
						</h3>
						<p className="text-xs text-outline">
							{getDocTypeLabel(doc.documentType)} &middot;{" "}
							{formatFileSize(doc.fileSize)} &middot;{" "}
							{formatDate(doc.createdAt)}
						</p>
					</div>
					<div className="flex items-center gap-1.5 shrink-0 ml-3">
						{/* Export dropdown */}
						<div className="relative">
							<button
								onClick={() => setExportOpen(!exportOpen)}
								className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors border border-border"
							>
								<Download className="w-3.5 h-3.5" />
								Export
								<ChevronDown className="w-3 h-3" />
							</button>
							{exportOpen && (
								<div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-10 min-w-[140px] py-1">
									<a
										href={viewUrl}
										download={doc.fileName}
										className="block px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
										onClick={() => setExportOpen(false)}
									>
										Original ({doc.fileName.split(".").pop()?.toUpperCase()})
									</a>
									<button
										onClick={() => exportAs("txt")}
										className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
									>
										Plain Text (.txt)
									</button>
									<button
										onClick={() => exportAs("pdf")}
										className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
									>
										PDF (.pdf)
									</button>
									{kind !== "html" && (
										<button
											onClick={() => exportAs("html")}
											className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
										>
											HTML (.html)
										</button>
									)}
								</div>
							)}
						</div>
						<button
							onClick={onClose}
							className="p-1.5 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
				<div className="flex-1 overflow-auto p-4">
					{kind === "image" ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={viewUrl}
							alt={doc.fileName}
							className="max-w-full max-h-[70vh] mx-auto rounded-lg"
						/>
					) : kind === "pdf" ? (
						<iframe
							src={viewUrl}
							className="w-full h-[70vh] rounded-lg border border-border"
							title={doc.fileName}
						/>
					) : kind === "html" ? (
						<iframe
							src={viewUrl}
							sandbox="allow-same-origin allow-popups allow-forms"
							className="w-full h-[70vh] rounded-lg border border-border bg-white"
							title={doc.fileName}
						/>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-outline">
							<FileText className="w-16 h-16 mb-4" />
							<p className="text-sm">
								Preview not available for this file type.
							</p>
							<a
								href={viewUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-3 text-sm text-primary hover:underline"
							>
								Download file
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Create Document Editor ──────────────────────────────────────────────────

interface LetterheadSettings {
	companyName: string;
	tagline: string;
	address: string;
	phone: string;
	email: string;
	accentColor: string;
}

function CreateDocumentModal({
	onClose,
	onCreated,
	userId,
	properties,
}: {
	onClose: () => void;
	onCreated: () => void;
	userId: string;
	properties: Property[];
}) {
	const editorRef = useRef<HTMLDivElement>(null);
	const [title, setTitle] = useState("");
	const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
	const [showLetterhead, setShowLetterhead] = useState(false);
	const [letterhead, setLetterhead] = useState<LetterheadSettings>({
		companyName: "",
		tagline: "",
		address: "",
		phone: "",
		email: "",
		accentColor: "#1e3a5f",
	});
	const [showSignatureArea, setShowSignatureArea] = useState(false);
	const [signatures, setSignatures] = useState<
		{ name: string; title: string }[]
	>([]);
	const [saving, setSaving] = useState(false);

	// Fetch saved letterhead from settings
	const [savedLetterhead, setSavedLetterhead] =
		useState<LetterheadConfig | null>(null);
	useEffect(() => {
		fetch("/api/settings/letterhead")
			.then((r) => r.json())
			.then((d) => setSavedLetterhead(d.letterhead ?? null))
			.catch(() => {});
	}, []);

	function execCommand(cmd: string, value?: string) {
		document.execCommand(cmd, false, value);
		editorRef.current?.focus();
	}

	function addSignatureLine() {
		setSignatures((prev) => [...prev, { name: "", title: "" }]);
		setShowSignatureArea(true);
	}

	function removeSignature(index: number) {
		setSignatures((prev) => prev.filter((_, i) => i !== index));
	}

	function buildDocumentHtml(): string {
		const content = editorRef.current?.innerHTML ?? "";
		const c = letterhead.accentColor || "#1e3a5f";

		let headerHtml = "";
		if (showLetterhead && letterhead.companyName) {
			const contactParts = [
				letterhead.phone,
				letterhead.email,
				letterhead.address,
			].filter(Boolean);
			headerHtml = `
				<div style="text-align:center;border-bottom:3px solid ${c};padding-bottom:16px;margin-bottom:24px;">
					<div style="font-size:22px;font-weight:bold;color:${c};letter-spacing:2px;">${letterhead.companyName}</div>
					${letterhead.tagline ? `<div style="font-size:12px;color:#666;margin-top:4px;letter-spacing:1px;">${letterhead.tagline}</div>` : ""}
					${contactParts.length > 0 ? `<div style="font-size:11px;color:#888;margin-top:8px;">${contactParts.join(" · ")}</div>` : ""}
				</div>`;
		}

		let signatureHtml = "";
		if (showSignatureArea && signatures.length > 0) {
			const sigBlocks = signatures
				.map(
					(s) => `
					<div style="flex:1;text-align:center;">
						<div style="border-top:1px solid #333;width:180px;margin:0 auto 8px;"></div>
						<div style="font-weight:bold;font-size:13px;">${s.name || "Name"}</div>
						${s.title ? `<div style="font-size:11px;color:#666;">${s.title}</div>` : ""}
					</div>`,
				)
				.join("");
			signatureHtml = `
				<div style="margin-top:48px;display:flex;gap:32px;justify-content:center;">
					${sigBlocks}
				</div>`;
		}

		return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || "Document"}</title>
<style>body{font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:40px auto;padding:20px;color:#222;line-height:1.7;} h1{font-size:20px;} h2{font-size:16px;} p{margin:8px 0;}</style>
</head><body>
${headerHtml}
${title ? `<h1 style="text-align:center;margin-bottom:24px;">${title}</h1>` : ""}
${content}
${signatureHtml}
</body></html>`;
	}

	function handlePrint() {
		const html = buildDocumentHtml();
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.print();
		}
	}

	function handleDownload() {
		const html = buildDocumentHtml();
		const blob = new Blob([html], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${(title || "document").replace(/\s+/g, "-").toLowerCase()}.html`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleSave() {
		const html = buildDocumentHtml();
		const blob = new Blob([html], { type: "text/html" });
		const file = new File(
			[blob],
			`${(title || "document").replace(/\s+/g, "-").toLowerCase()}.html`,
			{ type: "text/html" },
		);
		setSaving(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("userId", userId);
			if (selectedPropertyIds.length)
				formData.append("propertyIds", selectedPropertyIds.join(","));
			formData.append("documentType", "other");
			formData.append("skipIndexing", "true");
			const res = await fetch("/api/documents/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Upload failed");
			}
			onCreated();
			onClose();
		} catch (err) {
			console.error("[CreateDocumentModal] save failed:", err);
		} finally {
			setSaving(false);
		}
	}

	const ACCENT_PRESETS = [
		"#1e3a5f",
		"#0f766e",
		"#7c3aed",
		"#b91c1c",
		"#0369a1",
		"#15803d",
		"#92400e",
		"#1e1e1e",
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
			<div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl my-auto flex flex-col max-h-[calc(100vh-2rem)]">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
					<div className="flex items-center gap-2">
						<PenLine className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-bold text-on-surface">
							Create Document
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto">
					<div className="flex flex-col lg:flex-row">
						{/* Left: Settings */}
						<div className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border p-4 space-y-4 overflow-hidden">
							{/* Title */}
							<div>
								<label className="block text-xs font-medium text-on-surface-variant mb-1">
									Document Title
								</label>
								<input
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g. Sale Agreement"
									className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
								/>
							</div>

							{/* Associate with properties */}
							<div>
								<label className="block text-xs font-medium text-on-surface-variant mb-1">
									Attach to Properties{" "}
									<span className="text-outline">(optional)</span>
								</label>
								<div className="max-h-28 overflow-y-auto border border-border rounded-md bg-card p-2 space-y-0.5">
									{properties.length === 0 ? (
										<p className="text-xs text-outline py-1">No properties</p>
									) : (
										properties.map((p) => (
											<label
												key={p.id}
												className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer hover:text-on-surface py-0.5"
											>
												<input
													type="checkbox"
													checked={selectedPropertyIds.includes(p.id)}
													onChange={(e) => {
														setSelectedPropertyIds((prev) =>
															e.target.checked
																? [...prev, p.id]
																: prev.filter((id) => id !== p.id),
														);
													}}
													className="rounded border-border text-primary focus:ring-primary/20 w-3 h-3"
												/>
												<span className="truncate">{p.name}</span>
											</label>
										))
									)}
								</div>
							</div>

							{/* Letterhead toggle */}
							<div>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={showLetterhead}
										onChange={(e) => {
											const on = e.target.checked;
											setShowLetterhead(on);
											if (
												on &&
												savedLetterhead?.companyName &&
												!letterhead.companyName
											) {
												setLetterhead({
													companyName: savedLetterhead.companyName,
													tagline: savedLetterhead.tagline ?? "",
													address: savedLetterhead.address ?? "",
													phone: savedLetterhead.phone ?? "",
													email: savedLetterhead.email ?? "",
													accentColor: savedLetterhead.accentColor || "#1e3a5f",
												});
											}
										}}
										className="rounded border-border text-primary focus:ring-primary/20"
									/>
									<span className="text-xs font-medium text-on-surface-variant">
										Include Letterhead
									</span>
								</label>

								{/* Use saved letterhead */}
								{showLetterhead && savedLetterhead?.companyName && (
									<button
										type="button"
										onClick={() => {
											setLetterhead({
												companyName: savedLetterhead.companyName,
												tagline: savedLetterhead.tagline ?? "",
												address: savedLetterhead.address ?? "",
												phone: savedLetterhead.phone ?? "",
												email: savedLetterhead.email ?? "",
												accentColor: savedLetterhead.accentColor || "#1e3a5f",
											});
										}}
										className="flex items-center gap-1 text-badge text-primary hover:underline cursor-pointer mt-1"
									>
										<Bookmark className="w-3 h-3" />
										Use saved letterhead
									</button>
								)}

								{showLetterhead && (
									<div className="mt-3 space-y-2">
										<input
											type="text"
											value={letterhead.companyName}
											onChange={(e) =>
												setLetterhead((p) => ({
													...p,
													companyName: e.target.value,
												}))
											}
											placeholder="Company / Name"
											className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
										/>
										<input
											type="text"
											value={letterhead.tagline}
											onChange={(e) =>
												setLetterhead((p) => ({
													...p,
													tagline: e.target.value,
												}))
											}
											placeholder="Tagline / Motto"
											className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
										/>
										<input
											type="text"
											value={letterhead.address}
											onChange={(e) =>
												setLetterhead((p) => ({
													...p,
													address: e.target.value,
												}))
											}
											placeholder="Address"
											className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
										/>
										<div className="flex gap-2">
											<input
												type="text"
												value={letterhead.phone}
												onChange={(e) =>
													setLetterhead((p) => ({
														...p,
														phone: e.target.value,
													}))
												}
												placeholder="Phone"
												className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
											/>
											<input
												type="email"
												value={letterhead.email}
												onChange={(e) =>
													setLetterhead((p) => ({
														...p,
														email: e.target.value,
													}))
												}
												placeholder="Email"
												className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
											/>
										</div>
										{/* Accent colour */}
										<div>
											<label className="block text-badge font-medium text-outline mb-1">
												Accent Colour
											</label>
											<div className="flex gap-1 flex-wrap">
												{ACCENT_PRESETS.map((color) => (
													<button
														key={color}
														type="button"
														onClick={() =>
															setLetterhead((p) => ({
																...p,
																accentColor: color,
															}))
														}
														className={`w-5 h-5 rounded-full border-2 transition-all ${
															letterhead.accentColor === color
																? "border-on-surface scale-110"
																: "border-transparent"
														}`}
														style={{ backgroundColor: color }}
													/>
												))}
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Signatures */}
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="text-xs font-medium text-on-surface-variant">
										Signature Lines
									</label>
									<button
										type="button"
										onClick={addSignatureLine}
										className="text-badge text-primary hover:underline cursor-pointer flex items-center gap-0.5"
									>
										<Plus className="w-3 h-3" /> Add
									</button>
								</div>
								{signatures.map((sig, i) => (
									<div key={i} className="flex gap-1.5 items-center mb-2">
										<input
											type="text"
											value={sig.name}
											onChange={(e) =>
												setSignatures((prev) =>
													prev.map((s, si) =>
														si === i ? { ...s, name: e.target.value } : s,
													),
												)
											}
											placeholder="Name"
											className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
										/>
										<input
											type="text"
											value={sig.title}
											onChange={(e) =>
												setSignatures((prev) =>
													prev.map((s, si) =>
														si === i ? { ...s, title: e.target.value } : s,
													),
												)
											}
											placeholder="Title / Role"
											className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded-md bg-card text-on-surface focus:outline-none focus:border-primary/40"
										/>
										<button
											type="button"
											onClick={() => removeSignature(i)}
											className="p-1 text-outline hover:text-red-500 transition-colors"
										>
											<Trash2 className="w-3 h-3" />
										</button>
									</div>
								))}
								{signatures.length === 0 && (
									<p className="text-badge text-outline">
										No signature lines added yet.
									</p>
								)}
							</div>
						</div>

						{/* Right: Editor */}
						<div className="flex-1 flex flex-col min-h-0">
							{/* Toolbar */}
							<div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-border bg-surface-container/40">
								<button
									type="button"
									onClick={() => execCommand("bold")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Bold"
								>
									<Bold className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("italic")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Italic"
								>
									<Italic className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("underline")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Underline"
								>
									<Underline className="w-4 h-4" />
								</button>
								<div className="w-px h-5 bg-border mx-1" />
								<button
									type="button"
									onClick={() => execCommand("formatBlock", "h1")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Heading 1"
								>
									<Heading1 className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("formatBlock", "h2")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Heading 2"
								>
									<Heading2 className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("formatBlock", "p")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Paragraph"
								>
									<span className="text-xs font-bold">¶</span>
								</button>
								<div className="w-px h-5 bg-border mx-1" />
								<button
									type="button"
									onClick={() => execCommand("insertUnorderedList")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Bullet List"
								>
									<ListIcon className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("insertOrderedList")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Numbered List"
								>
									<ListOrdered className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => execCommand("insertHorizontalRule")}
									className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
									title="Horizontal Rule"
								>
									<Minus className="w-4 h-4" />
								</button>
							</div>

							{/* Editable area */}
							<div
								ref={editorRef}
								contentEditable
								suppressContentEditableWarning
								className="flex-1 min-h-[400px] px-6 py-5 text-sm text-on-surface focus:outline-none overflow-y-auto leading-relaxed"
								style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
								data-placeholder="Start typing your document here…"
							/>
						</div>
					</div>
				</div>

				{/* Footer actions */}
				<div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							<Printer className="w-3.5 h-3.5" /> Print
						</button>
						<button
							type="button"
							onClick={handleDownload}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
						>
							<Download className="w-3.5 h-3.5" /> Download
						</button>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
						>
							Cancel
						</button>
						<PrimaryButton
							onClick={handleSave}
							disabled={saving}
							className="px-4 py-2 gap-1.5"
						>
							{saving ? (
								<div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<Stamp className="w-3.5 h-3.5" />
							)}
							Save
						</PrimaryButton>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Main Documents Page ────────────────────────────────────────────────────

export default function DocumentsPage() {
	const { user, loading: authLoading } = useRequireAuth();
	const { activePortfolio } = usePortfolio();
	const animate = useAnimateOnce("documents");

	const [documents, setDocuments] = useState<AIDocument[]>([]);
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// UI state
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState<string>("");
	const [filterProperty, setFilterProperty] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("newest");
	const [viewMode, setViewMode] = useState<"card" | "table">("card");
	const [page, setPage] = useState(1);

	// Modals
	const [showUpload, setShowUpload] = useState(false);
	const [showCreate, setShowCreate] = useState(false);
	const [previewDoc, setPreviewDoc] = useState<AIDocument | null>(null);

	// Build property name map
	const propertyMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const p of properties) {
			map.set(p.id, p.name);
		}
		return map;
	}, [properties]);

	// Fetch data
	const fetchData = useCallback(async () => {
		if (!user) return;
		setLoading(true);
		setError(null);
		try {
			const [docs, props] = await Promise.all([
				PropertyAPI.listDocuments({ userId: user.id }),
				PropertyAPI.getMyProperties(
					user.id,
					activePortfolio?.id,
					activePortfolio?.createdBy === user.id,
				),
			]);
			setDocuments(docs);
			setProperties(props);
		} catch {
			setError("Failed to load documents");
		} finally {
			setLoading(false);
		}
	}, [user, activePortfolio]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Filter + sort
	const filtered = useMemo(() => {
		let list = documents;

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(d) =>
					d.fileName.toLowerCase().includes(q) ||
					getDocTypeLabel(d.documentType).toLowerCase().includes(q) ||
					d.propertyIds?.some((pid) =>
						propertyMap.get(pid)?.toLowerCase().includes(q),
					),
			);
		}

		if (filterType) {
			list = list.filter((d) => d.documentType === filterType);
		}

		if (filterProperty) {
			if (filterProperty === "__none__") {
				list = list.filter((d) => !d.propertyIds?.length);
			} else {
				list = list.filter((d) => d.propertyIds?.includes(filterProperty));
			}
		}

		list = [...list].sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return (
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
					);
				case "oldest":
					return (
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
					);
				case "name_asc":
					return a.fileName.localeCompare(b.fileName);
				case "name_desc":
					return b.fileName.localeCompare(a.fileName);
				case "size_high":
					return b.fileSize - a.fileSize;
				case "size_low":
					return a.fileSize - b.fileSize;
				case "type":
					return a.documentType.localeCompare(b.documentType);
				default:
					return 0;
			}
		});

		return list;
	}, [documents, search, filterType, filterProperty, sortBy, propertyMap]);

	// Pagination
	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
	const paginatedPage = Math.min(page, totalPages);
	const paginated = filtered.slice(
		(paginatedPage - 1) * ITEMS_PER_PAGE,
		paginatedPage * ITEMS_PER_PAGE,
	);

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [search, filterType, filterProperty, sortBy]);

	const hasActiveFilters =
		search || filterType || filterProperty || sortBy !== "newest";

	// Summary stats
	const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);
	const linkedCount = documents.filter((d) => d.propertyIds?.length).length;
	const typeSet = new Set(documents.map((d) => d.documentType));

	const summaryStats = [
		{
			label: "Documents",
			value: String(documents.length),
			icon: FileText,
		},
		{
			label: "Total Size",
			value: formatFileSize(totalSize),
			icon: HardDrive,
		},
		{
			label: "Linked",
			value: `${linkedCount}/${documents.length}`,
			icon: Link2,
		},
		{
			label: "Types",
			value: String(typeSet.size),
			icon: FileText,
		},
	];

	async function handleDelete(docId: string) {
		const ok = await PropertyAPI.deleteDocument(docId);
		if (ok) {
			setDocuments((prev) => prev.filter((d) => d.id !== docId));
		}
	}

	async function handleLinkProperties(docId: string, propertyIds: string[]) {
		const ok = await PropertyAPI.updateDocument(docId, { propertyIds });
		if (ok) {
			setDocuments((prev) =>
				prev.map((d) => (d.id === docId ? { ...d, propertyIds } : d)),
			);
		}
	}

	function handleUploaded(doc: AIDocument) {
		setDocuments((prev) => [doc, ...prev]);
	}

	if (authLoading || !user) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell>
			<div className="sz-page" data-animate={animate || undefined}>
				{/* Page header + summary stats */}
				<div className="flex flex-wrap items-start justify-between sz-gap-section mb-8 animate-fade-in">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<FileText className="w-5 h-5 text-secondary" />
							<h1 className="font-headline typo-page-title font-extrabold tracking-tighter text-primary">
								My Documents
							</h1>
						</div>
						<p className="typo-body text-on-surface-variant ml-8">
							Upload, manage, and organise your property documents
						</p>
					</div>
					{!loading && documents.length > 0 && (
						<div className="flex flex-nowrap md:flex-wrap items-start gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
							{summaryStats.map((stat, i) => (
								<div
									key={stat.label}
									style={{ animationDelay: `${i * 0.06}s` }}
									className="animate-fade-in-up shrink-0"
								>
									<SummaryStatCard
										label={stat.label}
										value={stat.value}
										icon={stat.icon}
									/>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Toolbar */}
				{!loading && (
					<div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
						{/* Search */}
						<div className="relative flex-1 min-w-[180px] sm:min-w-[220px] max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
							<input
								type="text"
								placeholder="Search file name, type, property…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
							/>
							{search && (
								<button
									onClick={() => setSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-outline hover:text-on-surface-variant"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>

						{/* Document type filter */}
						<div className="relative">
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer"
							>
								<option value="">All Types</option>
								{Object.values(AIDocumentType).map((t) => (
									<option key={t} value={t}>
										{getDocTypeLabel(t)}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>

						{/* Property filter */}
						<div className="relative">
							<select
								value={filterProperty}
								onChange={(e) => setFilterProperty(e.target.value)}
								className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer"
							>
								<option value="">All Properties</option>
								<option value="__none__">Unlinked</option>
								{properties.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>

						{/* Sort */}
						<div className="relative">
							<ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline pointer-events-none" />
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className="appearance-none pl-8 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer"
							>
								<option value="newest">Newest First</option>
								<option value="oldest">Oldest First</option>
								<option value="name_asc">Name A–Z</option>
								<option value="name_desc">Name Z–A</option>
								<option value="size_high">Size: Largest</option>
								<option value="size_low">Size: Smallest</option>
								<option value="type">Type</option>
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>

						{/* Clear filters */}
						{hasActiveFilters && (
							<button
								onClick={() => {
									setSearch("");
									setFilterType("");
									setFilterProperty("");
									setSortBy("newest");
								}}
								className="text-xs text-outline hover:text-primary underline underline-offset-2"
							>
								Clear filters
							</button>
						)}

						{/* Action buttons */}
						<div className="ml-auto flex items-center gap-2">
							<PrimaryButton onClick={() => setShowCreate(true)}>
								<PenLine className="w-4 h-4" />
								Create
							</PrimaryButton>
							<PrimaryButton onClick={() => setShowUpload(true)}>
								<Upload className="w-4 h-4" />
								Upload
							</PrimaryButton>
						</div>

						{/* View toggle */}
						<div className="flex items-center rounded-md border border-border bg-card p-0.5">
							<button
								onClick={() => setViewMode("card")}
								className={`p-1.5 rounded-sm transition-colors ${
									viewMode === "card"
										? "bg-blue-600 text-white"
										: "text-outline hover:text-on-surface-variant"
								}`}
								title="Card view"
							>
								<LayoutGrid className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewMode("table")}
								className={`p-1.5 rounded-sm transition-colors ${
									viewMode === "table"
										? "bg-blue-600 text-white"
										: "text-outline hover:text-on-surface-variant"
								}`}
								title="Table view"
							>
								<ListIcon className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* Loading state */}
				{loading && (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div
								key={i}
								className="bg-card border border-border rounded-xl p-5 animate-pulse max-w-xs"
							>
								<div className="h-28 bg-surface-container-highest rounded-lg mb-3" />
								<div className="h-4 bg-surface-container-highest rounded mb-2 w-3/4" />
								<div className="h-3 bg-surface-container-highest rounded w-1/2" />
							</div>
						))}
					</div>
				)}

				{/* Error state */}
				{error && <div className="text-center py-16 text-red-500">{error}</div>}

				{/* Empty state */}
				{!loading && !error && documents.length === 0 && (
					<div className="text-center py-16">
						<FileText className="w-12 h-12 text-outline mx-auto mb-4" />
						<p className="text-on-surface-variant">
							No documents yet. Upload or create your first document to get
							started.
						</p>
					</div>
				)}

				{/* No matches */}
				{!loading && documents.length > 0 && filtered.length === 0 && (
					<div className="text-center py-16 text-outline">
						No documents match your filters.
					</div>
				)}

				{/* Card view */}
				{!loading && paginated.length > 0 && viewMode === "card" && (
					<MasonryGrid minColWidth={220} maxCols={4}>
						{paginated.map((doc, i) => (
							<div
								key={doc.id}
								className="animate-fade-in-up"
								style={{ animationDelay: `${(i % 6) * 0.07}s` }}
							>
								<AIDocumentCard
									doc={doc}
									propertyNames={
										doc.propertyIds
											?.map((pid) => propertyMap.get(pid))
											.filter(Boolean) as string[] | undefined
									}
									onPreview={() => setPreviewDoc(doc)}
									onDelete={() => handleDelete(doc.id)}
									onLinkProperties={(pids) =>
										handleLinkProperties(doc.id, pids)
									}
									properties={properties}
								/>
							</div>
						))}
					</MasonryGrid>
				)}

				{/* Table view */}
				{!loading && paginated.length > 0 && viewMode === "table" && (
					<div className="overflow-x-auto rounded-xl border border-border bg-card">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-divider bg-surface-container/60 text-left text-xs font-semibold uppercase tracking-wider text-outline">
									<th className="px-4 py-3">File Name</th>
									<th className="px-4 py-3">Type</th>
									<th className="px-4 py-3">Property</th>
									<th className="px-4 py-3 text-right">Size</th>
									<th className="px-4 py-3">Uploaded</th>
									<th className="px-4 py-3 text-right">Confidence</th>
									<th className="px-4 py-3 w-20">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-divider">
								{paginated.map((doc) => (
									<tr
										key={doc.id}
										onClick={() => setPreviewDoc(doc)}
										className="cursor-pointer transition-colors hover:bg-surface-container"
									>
										<td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap max-w-60 truncate">
											<span className="flex items-center gap-2">
												<FileText className="w-4 h-4 text-outline shrink-0" />
												{doc.fileName}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant">
												{getDocTypeLabel(doc.documentType)}
											</span>
										</td>
										<td className="px-4 py-3 text-on-surface-variant max-w-[200px]">
											{doc.propertyIds?.length ? (
												<div className="flex flex-wrap gap-1">
													{doc.propertyIds.map((pid) => (
														<span
															key={pid}
															className="inline-block text-xs bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
														>
															{propertyMap.get(pid) ?? "Unknown"}
														</span>
													))}
												</div>
											) : (
												"—"
											)}
										</td>
										<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
											{formatFileSize(doc.fileSize)}
										</td>
										<td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
											<span className="flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(doc.createdAt)}
											</span>
										</td>
										<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
											{doc.confidence != null
												? `${(doc.confidence * 100).toFixed(0)}%`
												: "—"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="flex items-center justify-end gap-1">
												<button
													onClick={(e) => {
														e.stopPropagation();
														setPreviewDoc(doc);
													}}
													className="p-1.5 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
													title="Preview"
												>
													<Eye className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDelete(doc.id);
													}}
													className="p-1.5 rounded-lg text-outline hover:text-red-500 hover:bg-red-50 transition-colors"
													title="Delete"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{!loading && filtered.length > ITEMS_PER_PAGE && (
					<div className="flex items-center justify-between mt-6 px-1">
						<p className="text-xs text-outline">
							Showing {(paginatedPage - 1) * ITEMS_PER_PAGE + 1}–
							{Math.min(paginatedPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
							{filtered.length} documents
						</p>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={paginatedPage <= 1}
								className="p-1.5 rounded-lg border border-border bg-card text-outline hover:text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(pageNum) => (
									<button
										key={pageNum}
										onClick={() => setPage(pageNum)}
										className={`min-w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
											pageNum === paginatedPage
												? "bg-primary text-white"
												: "border border-border bg-card text-outline hover:text-on-surface-variant"
										}`}
									>
										{pageNum}
									</button>
								),
							)}
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={paginatedPage >= totalPages}
								className="p-1.5 rounded-lg border border-border bg-card text-outline hover:text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Upload Modal */}
			{showUpload && (
				<UploadDocumentModal
					userId={user.id}
					properties={properties}
					onClose={() => setShowUpload(false)}
					onUploaded={handleUploaded}
				/>
			)}

			{/* Create Document Modal */}
			{showCreate && (
				<CreateDocumentModal
					onClose={() => setShowCreate(false)}
					onCreated={fetchData}
					userId={user.id}
					properties={properties}
				/>
			)}

			{/* Preview Modal */}
			{previewDoc && (
				<DocumentPreviewModal
					doc={previewDoc}
					onClose={() => setPreviewDoc(null)}
				/>
			)}
		</AppShell>
	);
}
