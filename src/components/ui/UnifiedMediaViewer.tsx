"use client";

import { FileText, Mic, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ViewerKind =
	| "image"
	| "pdf"
	| "video"
	| "audio"
	| "html"
	| "text"
	| "pptx"
	| "document";

export interface UnifiedMediaSource {
	url: string;
	name: string;
	mimeType?: string;
	size?: number;
	kind?: ViewerKind;
}

interface UnifiedMediaViewerProps {
	source: UnifiedMediaSource;
	onClose: () => void;
	subtitle?: string;
	headerActions?: React.ReactNode;
	onPrev?: () => void;
	onNext?: () => void;
	hasPrev?: boolean;
	hasNext?: boolean;
	offsetTopClassName?: string;
	zLayerClassName?: string;
}

function formatSize(bytes?: number) {
	if (bytes == null) return null;
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindFromSource(source: UnifiedMediaSource): ViewerKind {
	if (source.kind) return source.kind;

	const mime = source.mimeType?.toLowerCase() ?? "";
	if (mime.startsWith("image/")) return "image";
	if (mime === "application/pdf") return "pdf";
	if (mime.startsWith("video/")) return "video";
	if (mime.startsWith("audio/")) return "audio";
	if (mime === "text/html") return "html";
	if (mime.startsWith("text/")) return "text";
	if (
		[
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"application/vnd.openxmlformats-officedocument.presentationml.slideshow",
		].includes(mime)
	)
		return "pptx";

	const ext = source.name.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
	if (
		[
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"bmp",
			"svg",
			"heic",
			"heif",
		].includes(ext)
	)
		return "image";
	if (ext === "pdf") return "pdf";
	if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
	if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
	if (["htm", "html"].includes(ext)) return "html";
	if (["txt", "md", "csv", "json", "xml", "log"].includes(ext)) return "text";
	if (["ppt", "pptx", "pps", "ppsx"].includes(ext)) return "pptx";
	return "document";
}

export default function UnifiedMediaViewer({
	source,
	onClose,
	subtitle,
	headerActions,
	onPrev,
	onNext,
	hasPrev,
	hasNext,
	offsetTopClassName = "top-16",
	zLayerClassName = "z-layer-modal",
}: UnifiedMediaViewerProps) {
	const kind = useMemo(() => kindFromSource(source), [source]);
	const [scale, setScale] = useState(1);
	const [textContent, setTextContent] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
			if (e.key === "ArrowRight" && hasNext && onNext) onNext();
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [onClose, onPrev, onNext, hasPrev, hasNext]);

	useEffect(() => {
		if (kind !== "text") {
			setTextContent(null);
			return;
		}
		fetch(source.url)
			.then((r) =>
				r.ok ? r.text() : Promise.reject(new Error("Failed to load text")),
			)
			.then(setTextContent)
			.catch(() => setTextContent(null));
	}, [kind, source.url]);

	// For PPTX files, resolve a pre-signed public URL via the /presign endpoint
	// (Office Online Viewer needs a publicly accessible URL, not a proxied API route)
	const [pptxPublicUrl, setPptxPublicUrl] = useState<string | null>(null);
	const [pptxError, setPptxError] = useState(false);
	useEffect(() => {
		if (kind !== "pptx") {
			setPptxPublicUrl(null);
			setPptxError(false);
			return;
		}
		// Derive the presign URL from the view URL pattern:
		// /api/properties/[id]/documents/[docId]/view → .../presign
		const presignUrl = source.url.replace(/\/view$/, "/presign");
		if (presignUrl === source.url) {
			// URL doesn't match the pattern — use as-is (e.g. already a direct URL)
			setPptxPublicUrl(source.url);
			return;
		}
		fetch(presignUrl)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.then((data: { url: string }) => setPptxPublicUrl(data.url))
			.catch(() => setPptxError(true));
	}, [kind, source.url]);

	const sizeLabel = formatSize(source.size);
	const mergedHeaderActions = (
		<>
			{kind === "image" && (
				<div className="flex items-center gap-2 rounded-md border border-white/15 bg-white/8 px-2 py-1">
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
			)}
			{headerActions}
		</>
	);

	const overlay = (
		<div
			className={`fixed inset-x-0 bottom-0 ${offsetTopClassName} ${zLayerClassName} flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-150`}
			onClick={onClose}
			onContextMenu={(e) => e.preventDefault()}
		>
			<div
				className="flex items-center justify-between px-4 py-3 bg-black/45 border-b border-white/10"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="min-w-0 flex-1 mr-4">
					<p className="text-sm font-medium text-white truncate font-body">
						{source.name}
					</p>
					<p className="text-[11px] text-white/60 font-body truncate">
						{subtitle ?? sizeLabel ?? "Preview"}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{mergedHeaderActions}
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
						title="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			<div
				className="relative flex-1 min-h-0"
				onClick={(e) => e.stopPropagation()}
			>
				{kind === "image" && (
					<div className="h-full flex flex-col items-center justify-center overflow-auto p-4 gap-3">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={source.url}
							alt={source.name}
							className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform select-none pointer-events-none"
							style={{
								transform: `scale(${scale})`,
								transformOrigin: "center",
							}}
							draggable={false}
						/>
					</div>
				)}

				{kind === "pdf" && (
					<div className="h-full p-4">
						<iframe
							src={source.url}
							title="PDF preview"
							className="w-full h-full rounded-md border border-white/10 bg-white"
						/>
					</div>
				)}

				{kind === "video" && (
					<div className="h-full p-4 flex items-center justify-center">
						<video
							src={source.url}
							controls
							autoPlay
							controlsList="nodownload"
							disablePictureInPicture
							onContextMenu={(e) => e.preventDefault()}
							className="max-w-5xl max-h-full rounded-lg shadow-2xl"
						/>
					</div>
				)}

				{kind === "audio" && (
					<div className="h-full p-4 flex flex-col items-center justify-center gap-6 text-white">
						<div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
							<Mic className="w-10 h-10 text-white/60" />
						</div>
						<audio
							src={source.url}
							controls
							autoPlay
							controlsList="nodownload"
							onContextMenu={(e) => e.preventDefault()}
							className="w-full max-w-lg"
						/>
					</div>
				)}

				{kind === "html" && (
					<div className="h-full p-4">
						<iframe
							src={source.url}
							sandbox="allow-same-origin allow-popups allow-forms"
							title="HTML preview"
							className="w-full h-full rounded-md border border-white/10 bg-white"
						/>
					</div>
				)}

				{kind === "text" && (
					<div className="h-full p-4">
						<div className="w-full h-full overflow-auto rounded-md border border-white/10 bg-card p-4">
							<pre className="text-xs text-on-surface whitespace-pre-wrap wrap-break-word font-mono">
								{textContent ?? "Text preview unavailable."}
							</pre>
						</div>
					</div>
				)}

				{kind === "pptx" && (
					<div className="h-full p-4 flex items-center justify-center">
						{pptxError ? (
							<div className="flex flex-col items-center gap-4 text-white/75">
								<FileText className="w-14 h-14" />
								<p className="text-sm">Could not load presentation preview.</p>
								<a
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-300 hover:underline"
								>
									Download file
								</a>
							</div>
						) : !pptxPublicUrl ? (
							<p className="text-sm text-white/50">Loading preview…</p>
						) : (
							<div className="w-full h-full">
								<iframe
									src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptxPublicUrl)}`}
									title="Presentation preview"
									className="w-full h-full rounded-md border border-white/10"
									allowFullScreen
								/>
							</div>
						)}
					</div>
				)}

				{kind === "document" && (
					<div className="h-full p-4 flex items-center justify-center">
						<div className="flex flex-col items-center gap-4 text-white/75">
							<FileText className="w-14 h-14" />
							<p className="text-sm">
								Preview not available for this file type.
							</p>
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-300 hover:underline"
							>
								Open file
							</a>
						</div>
					</div>
				)}

				{hasPrev && onPrev && (
					<button
						type="button"
						onClick={onPrev}
						className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
						aria-label="Previous"
					>
						&#8249;
					</button>
				)}
				{hasNext && onNext && (
					<button
						type="button"
						onClick={onNext}
						className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
						aria-label="Next"
					>
						&#8250;
					</button>
				)}
			</div>
		</div>
	);

	if (!mounted) {
		return null;
	}

	return createPortal(overlay, document.body);
}
