"use client";

import { toPlotWords } from "@/lib/plotwords";
import { Property } from "@/types/property";
import {
	Check,
	Copy,
	Facebook,
	Link2,
	Mail,
	MessageCircle,
	Sparkles,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShareModalProps {
	property: Pick<
		Property,
		"id" | "name" | "address" | "propertyType" | "coordinates" | "shortCode"
	>;
	open: boolean;
	onClose: () => void;
}

function getShareUrl(propertyId: string, shortCode?: string) {
	if (typeof window === "undefined") return "";
	const path = shortCode ? `/${shortCode}` : `/property/${propertyId}`;
	return `${window.location.origin}${path}`;
}

const SOCIAL_CHANNELS = [
	{
		key: "whatsapp",
		label: "WhatsApp",
		icon: MessageCircle,
		color: "bg-green-500 hover:bg-green-600",
		href: (url: string, text: string) =>
			`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
	},
	{
		key: "facebook",
		label: "Facebook",
		icon: Facebook,
		color: "bg-blue-600 hover:bg-blue-700",
		href: (url: string) =>
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
	},
	{
		key: "email",
		label: "Email",
		icon: Mail,
		color: "bg-gray-600 hover:bg-gray-700",
		href: (url: string, text: string) =>
			`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`Check out this property:\n${url}`)}`,
	},
] as const;

export default function ShareModal({
	property,
	open,
	onClose,
}: ShareModalProps) {
	const [copied, setCopied] = useState(false);
	const [pwCopied, setPwCopied] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const shareUrl = getShareUrl(property.id, property.shortCode);
	const shareText = `${property.name} — ${property.address}`;
	const hasCoords =
		property.coordinates &&
		(property.coordinates.lat !== 0 || property.coordinates.lng !== 0);
	const plotWordsCode = hasCoords
		? toPlotWords(property.coordinates.lat, property.coordinates.lng)
		: null;

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		if (!open) {
			setCopied(false);
			setPwCopied(false);
		}
	}, [open]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback for older browsers
			const input = document.createElement("input");
			input.value = shareUrl;
			document.body.appendChild(input);
			input.select();
			document.execCommand("copy");
			document.body.removeChild(input);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}, [shareUrl]);

	const handleNativeShare = useCallback(async () => {
		if (!navigator.share) return;
		try {
			await navigator.share({
				title: property.name,
				text: shareText,
				url: shareUrl,
			});
			onClose();
		} catch {
			// User cancelled — ignore
		}
	}, [property.name, shareText, shareUrl, onClose]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLDialogElement>) => {
			if (e.target === dialogRef.current) onClose();
		},
		[onClose],
	);

	if (!open) return null;

	return (
		<dialog
			ref={dialogRef}
			onClose={onClose}
			onClick={handleBackdropClick}
			className="backdrop:bg-black/40 bg-transparent p-0 m-auto max-w-sm w-full rounded-sm outline-none"
		>
			<div className="bg-card rounded-sm border border-outline-variant/30 shadow-xl p-5 space-y-4 max-w-sm w-full">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h2 className="text-base font-semibold text-on-surface font-headline">
						Share Property
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-full hover:bg-surface-container-highest transition-colors"
					>
						<X className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>

				{/* Property preview */}
				<div className="bg-surface-container-low dark:bg-surface-container rounded-sm p-3">
					<p className="text-sm font-medium text-on-surface truncate">
						{property.name}
					</p>
					<p className="text-xs text-on-surface-variant truncate mt-0.5">
						{property.address}
					</p>
				</div>

				{/* PlotWords code */}
				{plotWordsCode && (
					<div className="flex items-center gap-2">
						<div className="flex-1 flex items-center gap-2 bg-surface-container-low dark:bg-surface-container rounded-sm px-3 py-2 border border-outline-variant/30">
							<Sparkles className="w-4 h-4 text-primary shrink-0" />
							<span className="text-xs font-mono font-semibold text-primary truncate flex-1">
								{plotWordsCode}
							</span>
						</div>
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(plotWordsCode);
								setPwCopied(true);
								setTimeout(() => setPwCopied(false), 2000);
							}}
							className={`shrink-0 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${
								pwCopied
									? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
									: "bg-primary text-on-primary hover:bg-primary/90"
							}`}
						>
							{pwCopied ? (
								<span className="flex items-center gap-1">
									<Check className="w-3.5 h-3.5" /> Copied
								</span>
							) : (
								<span className="flex items-center gap-1">
									<Copy className="w-3.5 h-3.5" /> Copy
								</span>
							)}
						</button>
					</div>
				)}

				{/* Copy link */}
				<div className="flex items-center gap-2">
					<div className="flex-1 flex items-center gap-2 bg-surface-container-low dark:bg-surface-container rounded-sm px-3 py-2 border border-outline-variant/30">
						<Link2 className="w-4 h-4 text-on-surface-variant shrink-0" />
						<span className="text-xs text-on-surface-variant truncate flex-1">
							{shareUrl}
						</span>
					</div>
					<button
						type="button"
						onClick={handleCopy}
						className={`shrink-0 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${
							copied
								? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
								: "bg-primary text-on-primary hover:bg-primary/90"
						}`}
					>
						{copied ? (
							<span className="flex items-center gap-1">
								<Check className="w-3.5 h-3.5" /> Copied
							</span>
						) : (
							<span className="flex items-center gap-1">
								<Copy className="w-3.5 h-3.5" /> Copy
							</span>
						)}
					</button>
				</div>

				{/* Social channels */}
				<div className="space-y-2">
					<p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
						Share via
					</p>
					<div className="flex gap-2">
						{SOCIAL_CHANNELS.map((ch) => (
							<a
								key={ch.key}
								href={ch.href(shareUrl, shareText)}
								target="_blank"
								rel="noopener noreferrer"
								className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-white text-xs font-medium transition-colors ${ch.color}`}
							>
								<ch.icon className="w-4 h-4" />
								{ch.label}
							</a>
						))}
					</div>
				</div>

				{/* Native share (mobile) */}
				{typeof navigator !== "undefined" && "share" in navigator && (
					<button
						type="button"
						onClick={handleNativeShare}
						className="w-full py-2.5 rounded-sm border border-outline-variant/40 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
					>
						More sharing options…
					</button>
				)}
			</div>
		</dialog>
	);
}
