"use client";

import { CARD_GRADIENTS } from "@/components/dashboard/helpers";
import { formatCurrencyFull } from "@/lib/utils";
import { MediaType, Property } from "@/types/property";
import { ChevronLeft, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface PropertySlideshowWidgetProps {
	properties: Property[];
	onSelect: (id: string) => void;
}

const SLIDE_INTERVAL = 5000;

/** Get the first image URL for a property (media[] → images[] fallback). */
function getPropertyImage(p: Property): string | null {
	const fromMedia = p.media?.find((m) => m.type === MediaType.IMAGE);
	if (fromMedia) return fromMedia.url;
	if (p.images && p.images.length > 0) return p.images[0];
	return null;
}

export default function PropertySlideshowWidget({
	properties,
	onSelect,
}: PropertySlideshowWidgetProps) {
	const [activeIdx, setActiveIdx] = useState(0);
	const [slideDir, setSlideDir] = useState<"left" | "right">("left");
	const [slideKey, setSlideKey] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const slides = properties.slice(0, 8);
	const count = slides.length;

	const goNext = useCallback(() => {
		if (count <= 1) return;
		setSlideDir("left");
		setSlideKey((k) => k + 1);
		setActiveIdx((prev) => (prev + 1) % count);
	}, [count]);

	const goPrev = useCallback(() => {
		if (count <= 1) return;
		setSlideDir("right");
		setSlideKey((k) => k + 1);
		setActiveIdx((prev) => (prev - 1 + count) % count);
	}, [count]);

	const resetTimer = useCallback(() => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (count > 1) timerRef.current = setInterval(goNext, SLIDE_INTERVAL);
	}, [count, goNext]);

	useEffect(() => {
		resetTimer();
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [resetTimer]);

	if (slides.length === 0) return null;

	const current = slides[activeIdx];
	const gradient = CARD_GRADIENTS[activeIdx % CARD_GRADIENTS.length];
	const worth = current.currentValue || current.purchasePrice || 0;
	const imageUrl = getPropertyImage(current);
	const slideClass =
		slideDir === "left" ? "animate-slide-left" : "animate-slide-right";

	return (
		<div className="bg-card border border-border overflow-hidden sz-radius-card widget-card animate-fade-in-up">
			{/* Billboard image area */}
			<div
				key={slideKey}
				onClick={() => onSelect(current.id)}
				className={`relative h-72 md:h-80 lg:h-96 cursor-pointer ${!imageUrl ? gradient : ""} ${slideClass}`}
			>
				{/* Actual property image or gradient fallback */}
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt={current.name}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 60vw"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
						<ImageIcon className="w-40 h-40 text-white" />
					</div>
				)}

				{/* Nav controls */}
				{count > 1 && (
					<>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								goPrev();
								resetTimer();
							}}
							className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
						>
							<ChevronLeft className="w-5 h-5 text-white" />
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								goNext();
								resetTimer();
							}}
							className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
						>
							<ChevronRight className="w-5 h-5 text-white" />
						</button>
					</>
				)}

				{/* Slide counter badge */}
				{count > 1 && (
					<span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white typo-badge font-bold px-2 py-1 rounded-full">
						{activeIdx + 1} / {count}
					</span>
				)}

				{/* Bottom info overlay */}
				<div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-16 bg-linear-to-t from-black/70 to-transparent">
					<h4 className="font-headline typo-section-title font-bold text-white truncate">
						{current.name}
					</h4>
					<p className="typo-body-sm text-white/70 flex items-center gap-1 truncate mt-0.5">
						<MapPin className="w-3.5 h-3.5 shrink-0" />
						{current.address}
					</p>
				</div>
			</div>

			{/* Details row */}
			<div className="px-5 py-3.5 flex items-center justify-between">
				<div>
					<p className="font-headline typo-stat font-extrabold text-primary">
						{formatCurrencyFull(worth, current.country)}
					</p>
					<p className="typo-caption text-outline">
						{(current.area || 0).toLocaleString()} sqm
					</p>
				</div>

				{/* Dots */}
				{count > 1 && (
					<div className="flex gap-1.5">
						{slides.map((_, i) => (
							<button
								key={i}
								type="button"
								onClick={() => {
									setSlideDir(i > activeIdx ? "left" : "right");
									setSlideKey((k) => k + 1);
									setActiveIdx(i);
									resetTimer();
								}}
								className={`w-2 h-2 rounded-full transition-all ${
									i === activeIdx ? "bg-primary w-4" : "bg-outline-variant"
								}`}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
