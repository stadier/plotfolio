"use client";

import { FileText, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── helpers ──────────────────────────────────────────── */

type FileKind = "image" | "pdf" | "video" | "audio" | "pptx" | "document";

const PPTX_MIME_TYPES = new Set([
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.openxmlformats-officedocument.presentationml.slideshow",
]);

function getFileKind(file: File): FileKind {
	const t = file.type;
	if (t.startsWith("image/")) return "image";
	if (t === "application/pdf") return "pdf";
	if (t.startsWith("video/")) return "video";
	if (t.startsWith("audio/")) return "audio";
	if (PPTX_MIME_TYPES.has(t)) return "pptx";
	return "document";
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── per-type previews ───────────────────────────────── */

function ImagePreview({ url, name }: { url: string; name: string }) {
	const [scale, setScale] = useState(1);

	return (
		<div className="flex-1 flex flex-col items-center justify-center overflow-auto p-4">
			<div className="mb-3 flex items-center gap-2">
				<button
					type="button"
					onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
					className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
					title="Zoom out"
				>
					<ZoomOut className="w-3.5 h-3.5" />
				</button>
				<span className="text-xs text-white/70 font-mono min-w-[3ch] text-center">
					{Math.round(scale * 100)}%
				</span>
				<button
					type="button"
					onClick={() => setScale((s) => Math.min(4, s + 0.25))}
					className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
					title="Zoom in"
				>
					<ZoomIn className="w-3.5 h-3.5" />
				</button>
			</div>
			<div className="overflow-auto max-w-full max-h-full">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={url}
					alt={name}
					className="max-w-none rounded-lg shadow-2xl transition-transform select-none pointer-events-none"
					style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
					draggable={false}
				/>
			</div>
		</div>
	);
}

function PdfPreview({ url }: { url: string }) {
	return (
		<div className="flex-1 flex items-stretch p-4">
			<iframe
				src={url}
				title="PDF preview"
				className="w-full h-full rounded-lg border border-white/10 bg-white"
			/>
		</div>
	);
}

function VideoPreview({ url }: { url: string }) {
	return (
		<div className="flex-1 flex items-center justify-center p-4">
			<video
				src={url}
				controls
				controlsList="nodownload"
				disablePictureInPicture
				onContextMenu={(e) => e.preventDefault()}
				className="max-w-3xl max-h-full rounded-lg shadow-2xl"
			/>
		</div>
	);
}

function AudioPreview({ url, name }: { url: string; name: string }) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
			<div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
				<FileText className="w-10 h-10 text-white/60" />
			</div>
			<p className="text-sm text-white/80 font-medium">{name}</p>
			<audio
				src={url}
				controls
				controlsList="nodownload"
				onContextMenu={(e) => e.preventDefault()}
				className="max-w-sm w-full"
			/>
		</div>
	);
}

function PptxPreview({
	url,
	name,
	isLocal,
}: {
	url: string;
	name: string;
	isLocal: boolean;
}) {
	if (isLocal) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
				<div className="w-20 h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center">
					<FileText className="w-9 h-9 text-orange-300" />
				</div>
				<div className="text-center max-w-xs">
					<p className="text-sm font-medium text-white/80">{name}</p>
					<p className="text-xs text-white/50 mt-1">
						Presentation preview is available after the file has been uploaded.
					</p>
				</div>
			</div>
		);
	}
	const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
	return (
		<div className="flex-1 flex items-stretch p-4">
			<iframe
				src={viewerUrl}
				title="Presentation preview"
				className="w-full h-full rounded-lg border border-white/10"
				allowFullScreen
			/>
		</div>
	);
}

function UnsupportedPreview({ name }: { name: string }) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
			<div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
				<FileText className="w-9 h-9 text-white/50" />
			</div>
			<div className="text-center">
				<p className="text-sm font-medium text-white/80">{name}</p>
				<p className="text-xs text-white/50 mt-1">
					Preview not available for this file type
				</p>
			</div>
		</div>
	);
}

/* ── helpers: detect kind from URL extension ─────────── */

function getFileKindFromUrl(name: string, url: string): FileKind {
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
	if (["ppt", "pptx", "pps", "ppsx"].includes(ext)) return "pptx";
	return "document";
}

/* ── main component ──────────────────────────────────── */

export type DocumentPreviewProps =
	| {
			file: File;
			remoteUrl?: undefined;
			remoteName?: undefined;
			remoteSize?: undefined;
			onClose: () => void;
	  }
	| {
			file?: undefined;
			remoteUrl: string;
			remoteName: string;
			remoteSize?: number;
			onClose: () => void;
	  };

export default function DocumentPreview(props: DocumentPreviewProps) {
	const { onClose } = props;

	const isRemote = !!props.remoteUrl;
	const kind = isRemote
		? getFileKindFromUrl(props.remoteName, props.remoteUrl)
		: getFileKind(props.file!);
	const name = isRemote ? props.remoteName : props.file!.name;
	const size = isRemote ? props.remoteSize : props.file!.size;

	const objectUrl = useMemo(
		() => (isRemote ? null : URL.createObjectURL(props.file!)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isRemote, props.file],
	);
	const url = isRemote ? props.remoteUrl : objectUrl!;

	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const u = objectUrl;
		return () => {
			if (u) URL.revokeObjectURL(u);
		};
	}, [objectUrl]);

	// Close on Escape
	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [onClose]);

	// Close on backdrop click
	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === overlayRef.current) onClose();
		},
		[onClose],
	);

	return (
		<div
			ref={overlayRef}
			onClick={handleBackdropClick}
			onContextMenu={(e) => e.preventDefault()}
			className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
		>
			{/* toolbar */}
			<div className="flex items-center justify-between px-4 py-3 bg-black/40">
				<div className="min-w-0 flex-1 mr-4">
					<p className="text-sm font-medium text-white truncate font-body">
						{name}
					</p>
					{size != null && (
						<p className="text-[11px] text-white/50 font-body">
							{formatSize(size)}
						</p>
					)}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
						title="Close (Esc)"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* preview content */}
			{kind === "image" && <ImagePreview url={url} name={name} />}
			{kind === "pdf" && <PdfPreview url={url} />}
			{kind === "video" && <VideoPreview url={url} />}
			{kind === "audio" && <AudioPreview url={url} name={name} />}
			{kind === "pptx" && (
				<PptxPreview url={url} name={name} isLocal={!isRemote} />
			)}
			{kind === "document" && <UnsupportedPreview name={name} />}
		</div>
	);
}
