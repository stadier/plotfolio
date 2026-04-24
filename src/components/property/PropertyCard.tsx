"use client";

import PropertyPlaceholderSvg from "@/components/ui/PropertyPlaceholderSvg";
import UserAvatar from "@/components/ui/UserAvatar";
import {
	cn,
	formatArea,
	formatCurrency,
	formatDate,
	getPropertyMedia,
} from "@/lib/utils";
import {
	MediaType,
	Property,
	PropertyCondition,
	PropertyMedia,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Copy,
	DollarSign,
	Loader2,
	MapPin,
	Mic,
	Play,
	Square,
	Users,
	Video,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface PropertyCardProps {
	property: Property;
	onClick?: () => void;
	isSelected?: boolean;
	className?: string;
	sharedFrom?: string | null;
}

const statusColors = {
	[PropertyStatus.OWNED]: "bg-green-100 text-green-800",
	[PropertyStatus.FOR_SALE]: "bg-blue-100 text-blue-800",
	[PropertyStatus.FOR_RENT]: "bg-teal-100 text-teal-800",
	[PropertyStatus.FOR_LEASE]: "bg-cyan-100 text-cyan-800",
	[PropertyStatus.UNDER_CONTRACT]: "bg-yellow-100 text-yellow-800",
	[PropertyStatus.RENTED]: "bg-purple-100 text-purple-800",
	[PropertyStatus.LEASED]: "bg-indigo-100 text-indigo-800",
	[PropertyStatus.DEVELOPMENT]: "bg-orange-100 text-orange-800",
};

const typeColors = {
	[PropertyType.LAND]: "bg-gray-500",
	[PropertyType.HOUSE]: "bg-emerald-500",
	[PropertyType.APARTMENT]: "bg-blue-500",
	[PropertyType.BUILDING]: "bg-purple-500",
	[PropertyType.OFFICE]: "bg-sky-500",
	[PropertyType.RETAIL]: "bg-amber-500",
	[PropertyType.WAREHOUSE]: "bg-red-500",
	[PropertyType.FARM]: "bg-lime-500",
	[PropertyType.OTHER]: "bg-slate-400",
};

const conditionColors: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]:
		"bg-lime-50 text-lime-700 border border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800",
	[PropertyCondition.CLEARED]:
		"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
	[PropertyCondition.FOUNDATION]:
		"bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
	[PropertyCondition.HAS_STRUCTURE]:
		"bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
	[PropertyCondition.FENCED]:
		"bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
	[PropertyCondition.PAVED]:
		"bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
	[PropertyCondition.WATERLOGGED]:
		"bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
	[PropertyCondition.ROCKY]:
		"bg-stone-50 text-stone-700 border border-stone-200 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-800",
	[PropertyCondition.UNDER_CONSTRUCTION]:
		"bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
	[PropertyCondition.FINISHED]:
		"bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
	[PropertyCondition.RENOVATED]:
		"bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
	[PropertyCondition.NEEDS_REPAIR]:
		"bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

const conditionLabels: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]: "Bush",
	[PropertyCondition.CLEARED]: "Cleared",
	[PropertyCondition.FOUNDATION]: "Foundation",
	[PropertyCondition.HAS_STRUCTURE]: "Has Structure",
	[PropertyCondition.FENCED]: "Fenced",
	[PropertyCondition.PAVED]: "Paved",
	[PropertyCondition.WATERLOGGED]: "Waterlogged",
	[PropertyCondition.ROCKY]: "Rocky",
	[PropertyCondition.UNDER_CONSTRUCTION]: "Under Construction",
	[PropertyCondition.FINISHED]: "Finished",
	[PropertyCondition.RENOVATED]: "Renovated",
	[PropertyCondition.NEEDS_REPAIR]: "Needs Repair",
};

export default function PropertyCard({
	property,
	onClick,
	isSelected = false,
	className = "",
	sharedFrom,
}: PropertyCardProps) {
	const mediaItems = getPropertyMedia(property);
	const hasMultipleMedia = mediaItems.length > 1;
	const [currentIndex, setCurrentIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());

	const markLoaded = useCallback((idx: number) => {
		setLoadedSet((prev) => {
			if (prev.has(idx)) return prev;
			const next = new Set(prev);
			next.add(idx);
			return next;
		});
	}, []);

	const goNext = useCallback(() => {
		setCurrentIndex((i) => (i + 1) % mediaItems.length);
	}, [mediaItems.length]);

	const goPrev = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			setCurrentIndex((i) => (i - 1 + mediaItems.length) % mediaItems.length);
		},
		[mediaItems.length],
	);

	const goNextClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			goNext();
		},
		[goNext],
	);

	// Auto-advance every 4 seconds (only when not paused and current slide is an image)
	useEffect(() => {
		if (!hasMultipleMedia || paused) return;
		const current = mediaItems[currentIndex];
		if (current?.type !== MediaType.IMAGE) return;
		const timer = setInterval(goNext, 4000);
		return () => clearInterval(timer);
	}, [hasMultipleMedia, paused, goNext, currentIndex, mediaItems]);

	// Count how many of each media type
	const videoCount = mediaItems.filter(
		(m) => m.type === MediaType.VIDEO,
	).length;
	const audioCount = mediaItems.filter(
		(m) => m.type === MediaType.AUDIO,
	).length;

	return (
		<div
			className={cn(
				"bg-card rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-border",
				isSelected && "ring-2 ring-blue-500 border-blue-500",
				className,
			)}
			onClick={onClick}
		>
			{/* Property Media Slideshow or Placeholder */}
			<div
				className="h-48 bg-gray-200 dark:bg-surface-container rounded-t-xl relative overflow-hidden group"
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
			>
				{mediaItems.length > 0 ? (
					<>
						{mediaItems.map((item, idx) => (
							<MediaSlide
								key={`${item.url}-${idx}`}
								item={item}
								active={idx === currentIndex}
								loaded={loadedSet.has(idx)}
								onLoaded={() => markLoaded(idx)}
								propertyName={property.name}
								index={idx}
							/>
						))}

						{/* Prev / Next arrows — visible on hover */}
						{hasMultipleMedia && (
							<>
								<button
									type="button"
									onClick={goPrev}
									className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
									aria-label="Previous"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={goNextClick}
									className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
									aria-label="Next"
								>
									<ChevronRight className="w-4 h-4" />
								</button>
							</>
						)}

						{/* Dot indicators with media type hints */}
						{hasMultipleMedia && (
							<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
								{mediaItems.map((item, idx) => (
									<span
										key={idx}
										className={cn(
											"rounded-full transition-colors",
											idx === currentIndex ? "bg-white" : "bg-white/50",
											item.type === MediaType.IMAGE
												? "w-1.5 h-1.5"
												: "w-2.5 h-1.5",
										)}
										title={item.type}
									/>
								))}
							</div>
						)}

						{/* Media type badges — top-left */}
						{(videoCount > 0 || audioCount > 0) && (
							<div className="absolute top-3 left-3 flex gap-1 z-10">
								{videoCount > 0 && (
									<span className="flex items-center gap-0.5 bg-black/50 text-white typo-badge font-medium px-1.5 py-0.5 rounded-full">
										<Video className="w-3 h-3" />
										{videoCount}
									</span>
								)}
								{audioCount > 0 && (
									<span className="flex items-center gap-0.5 bg-black/50 text-white typo-badge font-medium px-1.5 py-0.5 rounded-full">
										<Mic className="w-3 h-3" />
										{audioCount}
									</span>
								)}
							</div>
						)}
					</>
				) : (
					<PropertyPlaceholderSvg
						seed={property.id || property.name}
						hasBuilding={
							property.propertyType === PropertyType.HOUSE ||
							property.propertyType === PropertyType.BUILDING ||
							property.propertyType === PropertyType.APARTMENT ||
							property.propertyType === PropertyType.OFFICE ||
							property.propertyType === PropertyType.RETAIL ||
							property.propertyType === PropertyType.WAREHOUSE ||
							/(building|duplex|bungalow|warehouse|office|factory|apartment|shop|plaza|mall|house)/.test(
								`${property.description ?? ""} ${property.zoning ?? ""}`.toLowerCase(),
							)
						}
						className="w-full h-full"
					/>
				)}

				{/* Status indicator — small pill at top-right */}
				<div
					className={cn(
						"absolute top-3 right-3 px-2 py-0.5 rounded-full typo-badge font-semibold uppercase tracking-wide",
						statusColors[property.status],
					)}
				>
					{property.status.replace("_", " ")}
				</div>
			</div>

			{/* Property Details */}
			<div className="p-4">
				{/* Shared portfolio badge */}
				{sharedFrom && (
					<div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
						<Users className="w-3 h-3 text-indigo-500 shrink-0" />
						<span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 truncate">
							Shared from {sharedFrom}
						</span>
					</div>
				)}

				{/* Type + Name row */}
				<div className="mb-3">
					<div className="flex items-center gap-2 mb-1">
						<span
							className={cn(
								"w-2 h-2 rounded-full shrink-0",
								typeColors[property.propertyType],
							)}
						/>
						<span className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
							{property.propertyType.replace("_", " ")}
						</span>
					</div>
					<h3 className="text-lg font-semibold text-on-surface mb-1">
						{property.name}
					</h3>
					<div className="flex items-center text-on-surface-variant text-sm">
						<MapPin className="w-4 h-4 mr-1" />
						<span className="truncate">{property.address}</span>
					</div>
				</div>

				{/* Condition Tags */}
				{property.conditions && property.conditions.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-3">
						{property.conditions.map((condition) => (
							<span
								key={condition}
								className={cn(
									"px-2 py-0.5 rounded-full text-[11px] font-medium",
									conditionColors[condition as PropertyCondition] ??
										"bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
								)}
							>
								{conditionLabels[condition as PropertyCondition] ?? condition}
							</span>
						))}
					</div>
				)}

				{/* Property Stats */}
				<div className="grid grid-cols-2 gap-4 mb-3">
					<div className="flex items-center text-sm">
						<DollarSign className="w-4 h-4 text-green-600 mr-1" />
						<div>
							<div className="text-on-surface-variant">Value</div>
							<div className="font-medium">
								{property.currentValue
									? formatCurrency(property.currentValue)
									: formatCurrency(property.purchasePrice)}
							</div>
						</div>
					</div>

					<div className="flex items-center text-sm">
						<Square className="w-4 h-4 text-blue-600 mr-1" />
						<div>
							<div className="text-on-surface-variant">Area</div>
							<div className="font-medium">{formatArea(property.area)}</div>
						</div>
					</div>

					{(property.quantity ?? 1) > 1 && (
						<div className="flex items-center text-sm">
							<Copy className="w-4 h-4 text-violet-600 mr-1" />
							<div>
								<div className="text-on-surface-variant">Quantity</div>
								<div className="font-medium">{property.quantity} units</div>
							</div>
						</div>
					)}
				</div>

				{/* Purchase Date */}
				<div className="flex items-center text-sm text-on-surface-variant">
					<Calendar className="w-4 h-4 mr-1" />
					<span>Purchased {formatDate(property.purchaseDate)}</span>
				</div>

				{/* Description */}
				{property.description && (
					<p className="text-sm text-on-surface-variant mt-2 line-clamp-2">
						{property.description}
					</p>
				)}

				{/* Owner info */}
				{property.owner && (
					<div className="mt-3 pt-3 border-t border-border">
						<UserAvatar
							name={property.owner.name}
							displayName={property.owner.displayName}
							username={property.owner.username}
							avatar={property.owner.avatar}
							ownerId={property.owner.id}
							size="xs"
							showLabel
						/>
					</div>
				)}
			</div>
		</div>
	);
}

/* ─── Media slide component ───────────────────────────────────── */

function MediaSlide({
	item,
	active,
	loaded,
	onLoaded,
	propertyName,
	index,
}: {
	item: PropertyMedia;
	active: boolean;
	loaded: boolean;
	onLoaded: () => void;
	propertyName: string;
	index: number;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);

	// Pause video/audio when slide is not active
	useEffect(() => {
		if (!active && videoRef.current) {
			videoRef.current.pause();
		}
	}, [active]);

	// Mark audio without thumbnail as loaded immediately
	useEffect(() => {
		if (item.type === MediaType.AUDIO && !item.thumbnail) {
			onLoaded();
		}
	}, [item.type, item.thumbnail, onLoaded]);

	if (item.type === MediaType.VIDEO) {
		return (
			<div
				className={cn(
					"absolute inset-0 transition-opacity duration-500",
					active ? "opacity-100 z-1" : "opacity-0 z-0",
				)}
			>
				{/* Thumbnail / poster while loading */}
				{!loaded && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-800">
						<Loader2 className="w-8 h-8 text-white animate-spin" />
					</div>
				)}
				<video
					ref={videoRef}
					src={item.url}
					poster={item.thumbnail}
					className="w-full h-full object-cover"
					muted
					playsInline
					loop
					onLoadedData={onLoaded}
					onClick={(e) => {
						e.stopPropagation();
						const v = e.currentTarget;
						v.paused ? v.play() : v.pause();
					}}
				/>
				{/* Play overlay when paused */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="bg-black/40 rounded-full p-2">
						<Play className="w-6 h-6 text-white fill-white" />
					</div>
				</div>
			</div>
		);
	}

	if (item.type === MediaType.AUDIO) {
		return (
			<div
				className={cn(
					"absolute inset-0 transition-opacity duration-500",
					active ? "opacity-100 z-1" : "opacity-0 z-0",
				)}
			>
				{/* Audio background — show thumbnail or waveform placeholder */}
				<div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-violet-600 to-indigo-800 text-white">
					{item.thumbnail ? (
						<Image
							src={item.thumbnail}
							alt={item.caption ?? `${propertyName} audio`}
							fill
							className="object-cover opacity-40"
							onLoad={onLoaded}
						/>
					) : null}
					<Mic className="w-10 h-10 mb-2 relative z-1" />
					<span className="text-xs font-medium relative z-1">
						{item.caption ?? "Audio"}
					</span>
					{active && (
						<audio
							src={item.url}
							controls
							className="mt-3 w-4/5 h-8 relative z-1"
							onLoadedData={onLoaded}
							onClick={(e) => e.stopPropagation()}
						/>
					)}
				</div>
			</div>
		);
	}

	// Default: IMAGE
	return (
		<div
			className={cn(
				"absolute inset-0 transition-opacity duration-500",
				active ? "opacity-100 z-1" : "opacity-0 z-0",
			)}
		>
			{/* Loading spinner shown until image completes loading */}
			{!loaded && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-surface-container z-2">
					<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
				</div>
			)}
			<Image
				src={item.url}
				alt={item.caption ?? `${propertyName} - ${index + 1}`}
				fill
				className="object-cover"
				onLoad={onLoaded}
			/>
		</div>
	);
}
