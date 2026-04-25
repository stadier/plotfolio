"use client";

import UnifiedMediaViewer from "@/components/ui/UnifiedMediaViewer";
import type { PropertyDocument, PropertyMedia } from "@/types/property";
import {
	Eye,
	FileText,
	Film,
	Image,
	Loader2,
	Mic,
	Music,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/* ── helpers ──────────────────────────────────────────── */

type FileKind = "image" | "pdf" | "video" | "audio" | "document";

function getFileKind(file: File): FileKind {
	const t = file.type;
	if (t.startsWith("image/")) return "image";
	if (t === "application/pdf") return "pdf";
	if (t.startsWith("video/")) return "video";
	if (t.startsWith("audio/")) return "audio";
	return "document";
}

export function isMediaFile(file: File): boolean {
	return (
		file.type.startsWith("image/") ||
		file.type.startsWith("video/") ||
		file.type.startsWith("audio/")
	);
}

function kindLabel(kind: FileKind) {
	const map: Record<FileKind, string> = {
		image: "Image",
		pdf: "PDF",
		video: "Video",
		audio: "Audio",
		document: "Document",
	};
	return map[kind];
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRemoteFileKind(name: string, url: string): FileKind {
	const ext = (name || url).split("?")[0].split(".").pop()?.toLowerCase() ?? "";
	const imageExts = new Set([
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
	if (imageExts.has(ext)) return "image";
	if (ext === "pdf") return "pdf";
	if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
	if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
	return "document";
}

/* ── thumbnails ──────────────────────────────────────── */

function ImageThumbnail({ file }: { file: File }) {
	const url = useMemo(() => URL.createObjectURL(file), [file]);
	useEffect(() => () => URL.revokeObjectURL(url), [url]);
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-100">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={url} alt={file.name} className="w-full h-full object-cover" />
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-badge font-medium px-1.5 py-0.5 rounded">
				<Image className="w-2.5 h-2.5" />
				IMG
			</span>
		</div>
	);
}

function RemoteImageThumbnail({ url, name }: { url: string; name: string }) {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-surface-container">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={url} alt={name} className="w-full h-full object-cover" />
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-badge font-medium px-1.5 py-0.5 rounded">
				<Image className="w-2.5 h-2.5" />
				IMG
			</span>
		</div>
	);
}

function PdfThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-card border border-border">
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

function VideoThumbnail({ file }: { file: File }) {
	const url = useMemo(() => URL.createObjectURL(file), [file]);
	useEffect(() => () => URL.revokeObjectURL(url), [url]);
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-900">
			<video src={url} className="w-full h-full object-cover" muted />
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
					<div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-10 border-l-white ml-0.5" />
				</div>
			</div>
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-purple-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
				<Film className="w-2.5 h-2.5" />
				VID
			</span>
		</div>
	);
}

function RemoteVideoThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
			<div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
				<div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-10 border-l-white ml-0.5" />
			</div>
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-purple-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
				<Film className="w-2.5 h-2.5" />
				VID
			</span>
		</div>
	);
}

function AudioThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-center">
			<Music className="w-8 h-8 text-amber-400" />
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-amber-500/90 text-white text-badge font-bold px-1.5 py-0.5 rounded">
				<Music className="w-2.5 h-2.5" />
				AUDIO
			</span>
		</div>
	);
}

function GenericDocThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-card border border-border">
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
				DOC
			</span>
		</div>
	);
}

/* ── file card (pending upload) ──────────────────────── */

function FileCard({
	file,
	onRemove,
	onPreview,
	onExtract,
	extracting,
	uploading,
	showExtract,
}: {
	file: File;
	onRemove: () => void;
	onPreview: () => void;
	onExtract: () => void;
	extracting: boolean;
	uploading?: boolean;
	showExtract?: boolean;
}) {
	const kind = getFileKind(file);
	const [showMenu, setShowMenu] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showMenu) return;
		const handler = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setShowMenu(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showMenu]);

	return (
		<div
			className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer bg-card border border-border ${
				uploading
					? "opacity-50 animate-pulse pointer-events-none"
					: "hover:shadow-md"
			}`}
			onClick={uploading ? undefined : onPreview}
			onContextMenu={(e) => {
				e.preventDefault();
				if (!uploading) setShowMenu(true);
			}}
		>
			{kind === "image" && <ImageThumbnail file={file} />}
			{kind === "pdf" && <PdfThumbnail />}
			{kind === "video" && <VideoThumbnail file={file} />}
			{kind === "audio" && <AudioThumbnail />}
			{kind === "document" && <GenericDocThumbnail />}

			<div className="px-2.5 py-2">
				<p className="text-[11px] font-medium text-on-surface truncate font-body leading-tight">
					{file.name}
				</p>
				{uploading ? (
					<div className="flex items-center gap-2 mt-1">
						<div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
							<div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onRemove();
							}}
							className="text-badge text-red-500 hover:text-red-600 font-medium"
						>
							Cancel
						</button>
					</div>
				) : (
					<p className="text-badge text-on-surface-variant mt-0.5 font-body">
						{formatSize(file.size)}
					</p>
				)}
			</div>

			<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onPreview();
					}}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
					title="Preview"
				>
					<Eye className="w-3 h-3" />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
					title="Remove"
				>
					<Trash2 className="w-3 h-3" />
				</button>
			</div>

			{showMenu && (
				<div
					ref={menuRef}
					className="absolute inset-x-1.5 bottom-1.5 z-20 bg-card rounded-lg shadow-lg border border-border py-1 animate-in fade-in zoom-in-95 duration-150"
					onClick={(e) => e.stopPropagation()}
				>
					{showExtract && (
						<button
							type="button"
							disabled={extracting}
							onClick={() => {
								setShowMenu(false);
								onExtract();
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
						>
							{extracting ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Sparkles className="w-3.5 h-3.5" />
							)}
							Extract &amp; Auto-fill
						</button>
					)}
					<button
						type="button"
						onClick={() => {
							setShowMenu(false);
							onPreview();
						}}
						className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
					>
						<Eye className="w-3.5 h-3.5" />
						Preview
					</button>
					<button
						type="button"
						onClick={() => {
							setShowMenu(false);
							onRemove();
						}}
						className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors"
					>
						<Trash2 className="w-3.5 h-3.5" />
						Remove
					</button>
				</div>
			)}
		</div>
	);
}

/* ── existing remote document card ───────────────────── */

function ExistingDocCard({
	doc,
	propertyId,
	onRemove,
	onPreview,
}: {
	doc: PropertyDocument;
	propertyId?: string;
	onRemove: () => void;
	onPreview: () => void;
}) {
	const kind = getRemoteFileKind(doc.name, doc.url);
	const viewUrl = propertyId
		? `/api/properties/${propertyId}/documents/${doc.id}/view`
		: doc.url;

	return (
		<div className="group relative rounded-xl overflow-hidden transition-all bg-card border border-border hover:shadow-md">
			{kind === "image" ? (
				<RemoteImageThumbnail url={viewUrl} name={doc.name} />
			) : kind === "pdf" ? (
				<PdfThumbnail />
			) : kind === "video" ? (
				<RemoteVideoThumbnail />
			) : kind === "audio" ? (
				<AudioThumbnail />
			) : (
				<GenericDocThumbnail />
			)}
			<div className="px-2.5 py-2">
				<p className="text-[11px] font-medium text-on-surface truncate font-body leading-tight">
					{doc.name}
				</p>
				<p className="text-badge text-on-surface-variant mt-0.5 font-body">
					{doc.size
						? formatSize(doc.size)
						: new Date(doc.uploadDate).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})}
				</p>
			</div>
			<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
				<button
					type="button"
					onClick={onPreview}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
					title="View"
				>
					<Eye className="w-3 h-3" />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
					title="Remove"
				>
					<Trash2 className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}

/* ── existing remote media card ──────────────────────── */

function ExistingMediaCard({
	item,
	onRemove,
}: {
	item: PropertyMedia;
	onRemove: () => void;
}) {
	const ext = item.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
	const videoExts = new Set(["mp4", "webm", "mov", "avi"]);
	const audioExts = new Set(["mp3", "wav", "ogg", "m4a", "aac"]);
	const isVideo = item.type === "video" || videoExts.has(ext);
	const isAudio = item.type === "audio" || audioExts.has(ext);
	const fileName = item.url.split("?")[0].split("/").pop() ?? "";

	return (
		<div className="group relative rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all">
			{isVideo ? (
				<RemoteVideoThumbnail />
			) : isAudio ? (
				<AudioThumbnail />
			) : (
				<RemoteImageThumbnail url={item.url} name={item.caption ?? fileName} />
			)}
			<div className="px-2.5 py-2">
				<p className="text-[11px] font-medium text-on-surface truncate font-body leading-tight">
					{item.caption ||
						fileName ||
						(isVideo ? "Video" : isAudio ? "Audio" : "Photo")}
				</p>
			</div>
			<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors"
					title="Remove"
				>
					<Trash2 className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}

/* ── sidebar ─────────────────────────────────────────── */

export interface DocumentSidebarProps {
	/** New document files pending upload */
	files: File[];
	/** New media files pending upload (images / videos / audio) */
	mediaFiles?: File[];
	/** Already-saved documents on the property */
	existingDocs?: PropertyDocument[];
	/** Already-saved media items on the property */
	existingMedia?: PropertyMedia[];
	propertyId?: string;
	onRemoveFile: (index: number) => void;
	onRemoveMediaFile?: (index: number) => void;
	onRemoveExistingDoc?: (docId: string) => void;
	onRemoveExistingMedia?: (url: string) => void;
	onClose: () => void;
	onExtract: (file: File) => void;
	extracting: boolean;
	/** Which tab to start on. Defaults to whichever has more items. */
	defaultTab?: "media" | "documents";
}

export default function DocumentSidebar({
	files,
	mediaFiles = [],
	existingDocs = [],
	existingMedia = [],
	propertyId,
	onRemoveFile,
	onRemoveMediaFile,
	onRemoveExistingDoc,
	onRemoveExistingMedia,
	onClose,
	onExtract,
	extracting,
	defaultTab,
}: DocumentSidebarProps) {
	const [previewFile, setPreviewFile] = useState<{
		url: string;
		name: string;
		size: number;
	} | null>(null);
	const [previewRemote, setPreviewRemote] = useState<PropertyDocument | null>(
		null,
	);
	const [readyDocIndices, setReadyDocIndices] = useState<Set<number>>(
		new Set(),
	);
	const [readyMediaIndices, setReadyMediaIndices] = useState<Set<number>>(
		new Set(),
	);

	const docCount = files.length + existingDocs.length;
	const mediaCount = mediaFiles.length + existingMedia.length;
	const totalCount = docCount + mediaCount;

	const [activeTab, setActiveTab] = useState<"media" | "documents">(
		defaultTab ?? (mediaCount >= docCount ? "media" : "documents"),
	);

	useEffect(() => {
		files.forEach((_, i) => {
			if (!readyDocIndices.has(i)) {
				const timer = setTimeout(
					() => setReadyDocIndices((prev) => new Set(prev).add(i)),
					800 + Math.random() * 600,
				);
				return () => clearTimeout(timer);
			}
		});
	}, [files, readyDocIndices]);

	useEffect(() => {
		mediaFiles.forEach((_, i) => {
			if (!readyMediaIndices.has(i)) {
				const timer = setTimeout(
					() => setReadyMediaIndices((prev) => new Set(prev).add(i)),
					800 + Math.random() * 600,
				);
				return () => clearTimeout(timer);
			}
		});
	}, [mediaFiles, readyMediaIndices]);

	if (totalCount === 0) return null;

	return (
		<>
			{previewFile && (
				<UnifiedMediaViewer
					source={previewFile}
					onClose={() => {
						URL.revokeObjectURL(previewFile.url);
						setPreviewFile(null);
					}}
				/>
			)}
			{previewRemote && (
				<UnifiedMediaViewer
					source={{
						url: propertyId
							? `/api/properties/${propertyId}/documents/${previewRemote.id}/view`
							: previewRemote.url,
						name: previewRemote.name,
						size: previewRemote.size,
					}}
					onClose={() => setPreviewRemote(null)}
				/>
			)}

			<aside className="w-full max-w-xl shrink-0 self-start lg:w-[220px] lg:self-stretch lg:max-w-none flex flex-col">
				{/* header */}
				<div className="flex items-center justify-between px-3 pt-3 pb-1">
					<p className="text-badge text-on-surface-variant font-body">
						{totalCount} file{totalCount !== 1 ? "s" : ""}
					</p>
					<button
						type="button"
						onClick={onClose}
						className="w-6 h-6 rounded-md hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
						title="Close panel"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>

				{/* tabs */}
				<div className="flex px-3 gap-1 pb-2">
					<button
						type="button"
						onClick={() => setActiveTab("media")}
						className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
							activeTab === "media"
								? "bg-primary/10 text-primary"
								: "text-on-surface-variant hover:bg-surface-container-high"
						}`}
					>
						<Image className="w-3 h-3" />
						Media
						{mediaCount > 0 && (
							<span
								className={`ml-0.5 px-1 rounded-full text-[9px] font-bold ${
									activeTab === "media"
										? "bg-primary text-white"
										: "bg-surface-container-high text-on-surface-variant"
								}`}
							>
								{mediaCount}
							</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("documents")}
						className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
							activeTab === "documents"
								? "bg-primary/10 text-primary"
								: "text-on-surface-variant hover:bg-surface-container-high"
						}`}
					>
						<FileText className="w-3 h-3" />
						Docs
						{docCount > 0 && (
							<span
								className={`ml-0.5 px-1 rounded-full text-[9px] font-bold ${
									activeTab === "documents"
										? "bg-primary text-white"
										: "bg-surface-container-high text-on-surface-variant"
								}`}
							>
								{docCount}
							</span>
						)}
					</button>
				</div>

				{/* scrollable content */}
				<div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 scrollbar-thin">
					{activeTab === "media" && (
						<>
							{mediaCount === 0 && (
								<div className="flex flex-col items-center justify-center py-8 text-center gap-2">
									<Mic className="w-6 h-6 text-on-surface-variant/40" />
									<p className="text-[11px] text-on-surface-variant font-body">
										No media yet.
										<br />
										Upload photos, videos or audio.
									</p>
								</div>
							)}
							{existingMedia.map((item) => (
								<ExistingMediaCard
									key={item.url}
									item={item}
									onRemove={() => onRemoveExistingMedia?.(item.url)}
								/>
							))}
							{mediaFiles.map((file, i) => (
								<FileCard
									key={`${file.name}-${file.size}-${i}`}
									file={file}
									uploading={!readyMediaIndices.has(i)}
									onRemove={() => onRemoveMediaFile?.(i)}
									onPreview={() =>
										setPreviewFile({
											url: URL.createObjectURL(file),
											name: file.name,
											size: file.size,
										})
									}
									onExtract={() => {}}
									extracting={false}
									showExtract={false}
								/>
							))}
						</>
					)}

					{activeTab === "documents" && (
						<>
							{docCount === 0 && (
								<div className="flex flex-col items-center justify-center py-8 text-center gap-2">
									<FileText className="w-6 h-6 text-on-surface-variant/40" />
									<p className="text-[11px] text-on-surface-variant font-body">
										No documents yet.
										<br />
										Upload surveys, deeds or permits.
									</p>
								</div>
							)}
							{existingDocs.map((doc) => (
								<ExistingDocCard
									key={doc.id}
									doc={doc}
									propertyId={propertyId}
									onRemove={() => onRemoveExistingDoc?.(doc.id)}
									onPreview={() => setPreviewRemote(doc)}
								/>
							))}
							{files.map((file, i) => (
								<FileCard
									key={`${file.name}-${file.size}-${i}`}
									file={file}
									uploading={!readyDocIndices.has(i)}
									onRemove={() => onRemoveFile(i)}
									onPreview={() =>
										setPreviewFile({
											url: URL.createObjectURL(file),
											name: file.name,
											size: file.size,
										})
									}
									onExtract={() => onExtract(file)}
									extracting={extracting}
									showExtract={true}
								/>
							))}
						</>
					)}
				</div>
			</aside>
		</>
	);
}
