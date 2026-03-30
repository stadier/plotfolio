"use client";

import {
	Eye,
	FileText,
	Film,
	Image,
	Loader2,
	Music,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DocumentPreview from "./DocumentPreview";

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

/* ── thumbnail per type ──────────────────────────────── */

function ImageThumbnail({ file }: { file: File }) {
	const url = useMemo(() => URL.createObjectURL(file), [file]);
	useEffect(() => () => URL.revokeObjectURL(url), [url]);

	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-100">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={url} alt={file.name} className="w-full h-full object-cover" />
			{/* subtle badge */}
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
				<Image className="w-2.5 h-2.5" />
				IMG
			</span>
		</div>
	);
}

function PdfThumbnail({ file }: { file: File }) {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-white border border-slate-200">
			{/* page body lines */}
			<div className="p-3 pt-4 flex flex-col gap-1.5">
				<div className="h-1.5 w-3/4 rounded-full bg-slate-200" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-5/6 rounded-full bg-slate-100" />
				<div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
			</div>
			{/* dog-ear fold */}
			<div className="absolute top-0 right-0 w-5 h-5">
				<div className="absolute top-0 right-0 w-0 h-0 border-t-20 border-t-slate-100 border-l-20 border-l-transparent" />
				<div className="absolute top-0 right-0 w-0 h-0 border-b-20 border-b-slate-200/60 border-l-20 border-l-transparent" />
			</div>
			{/* badge */}
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
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
			{/* play button overlay */}
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
					<div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-10 border-l-white ml-0.5" />
				</div>
			</div>
			{/* badge */}
			<span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
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
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
				<Music className="w-2.5 h-2.5" />
				AUDIO
			</span>
		</div>
	);
}

function GenericDocThumbnail() {
	return (
		<div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-white border border-slate-200">
			<div className="p-3 pt-4 flex flex-col gap-1.5">
				<div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
				<div className="h-1.5 w-full rounded-full bg-slate-100" />
				<div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
				<div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
			</div>
			{/* dog-ear fold */}
			<div className="absolute top-0 right-0 w-5 h-5">
				<div className="absolute top-0 right-0 w-0 h-0 border-t-20 border-t-slate-100 border-l-20 border-l-transparent" />
				<div className="absolute top-0 right-0 w-0 h-0 border-b-20 border-b-slate-300/60 border-l-20 border-l-transparent" />
			</div>
			<span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-slate-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
				<FileText className="w-2.5 h-2.5" />
				DOC
			</span>
		</div>
	);
}

/* ── single document card ────────────────────────────── */

function DocumentCard({
	file,
	onRemove,
	onPreview,
	onExtract,
	extracting,
}: {
	file: File;
	onRemove: () => void;
	onPreview: () => void;
	onExtract: () => void;
	extracting: boolean;
}) {
	const kind = getFileKind(file);
	const [showMenu, setShowMenu] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu on outside click
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
			className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
			onClick={onPreview}
			onContextMenu={(e) => {
				e.preventDefault();
				setShowMenu(true);
			}}
		>
			{/* thumbnail */}
			{kind === "image" && <ImageThumbnail file={file} />}
			{kind === "pdf" && <PdfThumbnail file={file} />}
			{kind === "video" && <VideoThumbnail file={file} />}
			{kind === "audio" && <AudioThumbnail />}
			{kind === "document" && <GenericDocThumbnail />}

			{/* info row */}
			<div className="px-2.5 py-2">
				<p className="text-[11px] font-medium text-on-surface truncate font-body leading-tight">
					{file.name}
				</p>
				<p className="text-[10px] text-on-surface-variant mt-0.5 font-body">
					{kindLabel(kind)} &middot; {formatSize(file.size)}
				</p>
			</div>

			{/* hover actions */}
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

			{/* right-click context menu */}
			{showMenu && (
				<div
					ref={menuRef}
					className="absolute inset-x-1.5 bottom-1.5 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in fade-in zoom-in-95 duration-150"
					onClick={(e) => e.stopPropagation()}
				>
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
					<button
						type="button"
						onClick={() => {
							setShowMenu(false);
							onPreview();
						}}
						className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-on-surface-variant hover:bg-slate-50 transition-colors"
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

/* ── sidebar ─────────────────────────────────────────── */

interface DocumentSidebarProps {
	files: File[];
	onRemoveFile: (index: number) => void;
	onClose: () => void;
	onExtract: (file: File) => void;
	extracting: boolean;
}

export default function DocumentSidebar({
	files,
	onRemoveFile,
	onClose,
	onExtract,
	extracting,
}: DocumentSidebarProps) {
	const [previewFile, setPreviewFile] = useState<File | null>(null);

	if (files.length === 0) return null;

	return (
		<>
			{previewFile && (
				<DocumentPreview
					file={previewFile}
					onClose={() => setPreviewFile(null)}
				/>
			)}
			<aside className="w-[220px] shrink-0 bg-slate-50/80 border-l border-slate-200 flex flex-col h-full">
				{/* header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
					<div>
						<h3 className="text-xs font-bold text-primary uppercase tracking-wider font-headline">
							Documents
						</h3>
						<p className="text-[10px] text-on-surface-variant mt-0.5 font-body">
							{files.length} file{files.length !== 1 ? "s" : ""} uploaded
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-6 h-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-on-surface-variant transition-colors"
						title="Close panel"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>

				{/* scrollable file list */}
				<div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
					{files.map((file, i) => (
						<DocumentCard
							key={`${file.name}-${file.size}-${i}`}
							file={file}
							onRemove={() => onRemoveFile(i)}
							onPreview={() => setPreviewFile(file)}
							onExtract={() => onExtract(file)}
							extracting={extracting}
						/>
					))}
				</div>
			</aside>
		</>
	);
}
