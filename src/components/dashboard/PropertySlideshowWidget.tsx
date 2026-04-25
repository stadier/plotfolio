"use client";

import PropertyPlaceholderSvg from "@/components/ui/PropertyPlaceholderSvg";
import { formatCurrencyFull, getPropertyMedia } from "@/lib/utils";
import { MediaType, Property, PropertyType } from "@/types/property";
import { ChevronLeft, ChevronRight, MapPin, Mic, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface PropertySlideshowWidgetProps {
	properties: Property[];
	onSelect: (id: string) => void;
}

const SLIDE_INTERVAL = 5000;

function MediaTile({
	url,
	type,
	thumbnail,
	caption,
	className,
	overlay,
}: {
	url: string;
	type: MediaType;
	thumbnail?: string;
	caption?: string;
	className: string;
	overlay?: React.ReactNode;
}) {
	if (type === MediaType.VIDEO) {
		return (
			<div className={`relative overflow-hidden ${className}`}>
				<Image
					src={thumbnail || url}
					alt={caption || "Video"}
					fill
					className="object-cover"
					sizes="(max-width: 768px) 100vw, 50vw"
				/>
				<div className="absolute inset-0 bg-black/35 flex items-center justify-center">
					<div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
						<Play className="w-4 h-4 text-white fill-white" />
					</div>
				</div>
				{overlay}
			</div>
		);
	}

	if (type === MediaType.AUDIO) {
		return (
			<div
				className={`relative overflow-hidden bg-linear-to-br from-violet-700 to-indigo-900 flex items-center justify-center ${className}`}
			>
				<div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
					<Mic className="w-5 h-5 text-white" />
				</div>
				{overlay}
			</div>
		);
	}

	return (
		<div className={`relative overflow-hidden ${className}`}>
			<Image
				src={url}
				alt={caption || "Property media"}
				fill
				className="object-cover"
				sizes="(max-width: 768px) 100vw, 60vw"
			/>
			{overlay}
		</div>
	);
}

function MediaMosaic({ property }: { property: Property }) {
	const media = getPropertyMedia(property);
	if (media.length === 0) {
		return (
			<PropertyPlaceholderSvg
				seed={property.id || property.name}
				hasBuilding={hasBuilding(property)}
				className="absolute inset-0"
			/>
		);
	}

	const visible = media.slice(0, 4);
	const extra = media.length - visible.length;

	if (visible.length === 1) {
		const item = visible[0];
		return (
			<MediaTile
				url={item.url}
				type={item.type}
				thumbnail={item.thumbnail}
				caption={item.caption}
				className="absolute inset-0"
			/>
		);
	}

	if (visible.length === 2) {
		return (
			<div className="absolute inset-0 grid grid-cols-2 gap-0.5 bg-card/20">
				{visible.map((item, idx) => (
					<MediaTile
						key={`${item.url}-${idx}`}
						url={item.url}
						type={item.type}
						thumbnail={item.thumbnail}
						caption={item.caption}
						className="h-full"
					/>
				))}
			</div>
		);
	}

	return (
		<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 bg-card/20">
			<MediaTile
				url={visible[0].url}
				type={visible[0].type}
				thumbnail={visible[0].thumbnail}
				caption={visible[0].caption}
				className="col-span-2 row-span-3"
			/>
			{visible.slice(1).map((item, idx) => {
				const isLastVisible = idx === visible.slice(1).length - 1;
				return (
					<MediaTile
						key={`${item.url}-${idx + 1}`}
						url={item.url}
						type={item.type}
						thumbnail={item.thumbnail}
						caption={item.caption}
						className="col-span-1"
						overlay={
							extra > 0 && isLastVisible ? (
								<div className="absolute inset-0 bg-black/55 flex items-center justify-center">
									<span className="font-headline text-2xl font-extrabold text-white">
										+{extra}
									</span>
								</div>
							) : undefined
						}
					/>
				);
			})}
		</div>
	);
}

function hasBuilding(p: Property): boolean {
	if (
		p.propertyType === PropertyType.HOUSE ||
		p.propertyType === PropertyType.BUILDING ||
		p.propertyType === PropertyType.APARTMENT ||
		p.propertyType === PropertyType.OFFICE ||
		p.propertyType === PropertyType.RETAIL ||
		p.propertyType === PropertyType.WAREHOUSE
	)
		return true;
	const text = `${p.description ?? ""} ${p.zoning ?? ""}`.toLowerCase();
	return /(building|duplex|bungalow|warehouse|office|factory|apartment|shop|plaza|mall|house)/.test(
		text,
	);
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

	useEffect(() => {
		if (count === 0) {
			setActiveIdx(0);
			return;
		}
		if (activeIdx >= count) {
			setActiveIdx(0);
		}
	}, [activeIdx, count]);

	if (slides.length === 0) return null;

	const current = slides[activeIdx];
	const worth = current.currentValue || current.purchasePrice || 0;
	const slideClass =
		slideDir === "left" ? "animate-slide-left" : "animate-slide-right";

	return (
		<div className="bg-card border border-border overflow-hidden sz-radius-card widget-card animate-fade-in-up">
			{/* Billboard image area */}
			<div
				key={slideKey}
				onClick={() => onSelect(current.id)}
				className={`relative h-72 md:h-80 lg:h-96 cursor-pointer ${slideClass}`}
			>
				{/* Property media collage */}
				<MediaMosaic property={current} />

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
