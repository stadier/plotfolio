"use client";

import { useRequireAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { usePortfolio } from "@/components/PortfolioContext";
import EstateCard from "@/components/property/EstateCard";
import {
	formatDate,
	getStatusColor,
} from "@/components/property/propertyDisplayHelpers";
import PropertyDrawer from "@/components/property/PropertyDrawer";
import StatusToggle from "@/components/property/StatusToggle";
import SummaryStatCard from "@/components/property/SummaryStatCard";
import AbbreviatedNumber from "@/components/ui/AbbreviatedNumber";
import MasonryGrid from "@/components/ui/MasonryGrid";
import PrimaryButton from "@/components/ui/PrimaryButton";
import PropertyPlaceholderSvg from "@/components/ui/PropertyPlaceholderSvg";
import {
	PageHero,
	PropertiesPageSkeleton,
	PropertyGridSkeleton,
} from "@/components/ui/skeletons";
import useAnimateOnce from "@/hooks/useAnimateOnce";
import useDelayedFlag from "@/hooks/useDelayedFlag";
import usePersistedState from "@/hooks/usePersistedState";
import {
	queryKeys,
	useDeleteProperty,
	useMyProperties,
	useUpdateProperty,
} from "@/hooks/usePropertyQueries";
import { formatCurrencyFull, getPropertyMedia } from "@/lib/utils";
import {
	MediaType,
	Property,
	PropertyCondition,
	PropertyMedia,
	PropertyStatus,
	PropertyType,
} from "@/types/property";
import { useQueryClient } from "@tanstack/react-query";
import {
	ArrowUpDown,
	Building2,
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FileText,
	Home,
	Layers,
	LayoutGrid,
	LayoutPanelTop,
	List,
	MapPin,
	Mic,
	Pencil,
	Play,
	Plus,
	Search,
	Trash2,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface PropertyPreviewConfig {
	src: string;
	label: string;
}

const MOCK_PROPERTY_PREVIEWS: Record<string, PropertyPreviewConfig> = {
	"1": {
		src: "/mock-properties/maitama-overview.svg",
		label: "Aerial parcel view",
	},
	"2": {
		src: "/mock-properties/gwarinpa-foundation.svg",
		label: "Development progress",
	},
	"3": {
		src: "/mock-properties/jahi-garden.svg",
		label: "Site preview",
	},
	"5": {
		src: "/mock-properties/wuye-corner-plot.svg",
		label: "Street-facing plot",
	},
	"6": {
		src: "/mock-properties/karsana-expanse.svg",
		label: "Open land preview",
	},
};

function hydratePropertyPreview(property: Property): Property {
	const preview = MOCK_PROPERTY_PREVIEWS[property.id];

	if (
		!preview ||
		(property.images?.length ?? 0) > 0 ||
		(property.media?.length ?? 0) > 0
	) {
		return property;
	}

	return {
		...property,
		images: [preview.src],
	};
}

function getStatusDot(status: PropertyStatus): string {
	switch (status) {
		case PropertyStatus.OWNED:
			return "bg-green-500";
		case PropertyStatus.FOR_SALE:
			return "bg-blue-500";
		case PropertyStatus.DEVELOPMENT:
			return "bg-yellow-500";
		case PropertyStatus.UNDER_CONTRACT:
			return "bg-orange-500";
		case PropertyStatus.RENTED:
			return "bg-purple-500";
		default:
			return "bg-gray-400";
	}
}

function getTypeLabel(type: PropertyType): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CONDITION_LABELS: Partial<Record<PropertyCondition, string>> = {
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

const CONDITION_COLORS: Partial<Record<PropertyCondition, string>> = {
	[PropertyCondition.BUSH]: "bg-lime-50 text-lime-700 border-lime-200",
	[PropertyCondition.CLEARED]: "bg-amber-50 text-amber-700 border-amber-200",
	[PropertyCondition.FOUNDATION]:
		"bg-orange-50 text-orange-700 border-orange-200",
	[PropertyCondition.HAS_STRUCTURE]: "bg-sky-50 text-sky-700 border-sky-200",
	[PropertyCondition.FENCED]: "bg-violet-50 text-violet-700 border-violet-200",
	[PropertyCondition.PAVED]: "bg-slate-50 text-slate-700 border-slate-200",
	[PropertyCondition.WATERLOGGED]: "bg-cyan-50 text-cyan-700 border-cyan-200",
	[PropertyCondition.ROCKY]: "bg-stone-50 text-stone-700 border-stone-200",
	[PropertyCondition.UNDER_CONSTRUCTION]:
		"bg-yellow-50 text-yellow-700 border-yellow-200",
	[PropertyCondition.FINISHED]:
		"bg-emerald-50 text-emerald-700 border-emerald-200",
	[PropertyCondition.RENOVATED]: "bg-teal-50 text-teal-700 border-teal-200",
	[PropertyCondition.NEEDS_REPAIR]: "bg-red-50 text-red-700 border-red-200",
};

function getLocalityLabel(address?: string): string {
	if (!address) return "No address";
	return address.split(",").slice(0, 2).join(",").trim();
}

function hasBuildingFootprint(property: Property): boolean {
	if (
		property.propertyType === PropertyType.BUILDING ||
		property.propertyType === PropertyType.OFFICE ||
		property.propertyType === PropertyType.RETAIL ||
		property.propertyType === PropertyType.WAREHOUSE ||
		property.propertyType === PropertyType.APARTMENT ||
		property.propertyType === PropertyType.HOUSE
	) {
		return true;
	}

	const text =
		`${property.description ?? ""} ${property.zoning ?? ""}`.toLowerCase();
	return /(building|duplex|bungalow|warehouse|office|factory|apartment|shop|plaza|mall|house)/.test(
		text,
	);
}

function LandGlyph() {
	return (
		<svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
			<path
				d="M5 21L16 10L27 21"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M4 24H28"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				d="M10 18L14 22"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				d="M18 16L23 21"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function LandWithBuildingGlyph() {
	return (
		<svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
			<path
				d="M4 24H28"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				d="M6 21L16 13L26 21"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="11"
				y="8"
				width="10"
				height="10"
				rx="1.8"
				stroke="currentColor"
				strokeWidth="1.8"
			/>
			<path
				d="M15 13H17"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				d="M16 8V18"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function PropertyKindBadge({ property }: { property: Property }) {
	const built = hasBuildingFootprint(property);

	return (
		<div
			className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
			title={built ? "Land with building" : "Land parcel"}
		>
			{built ? <LandWithBuildingGlyph /> : <LandGlyph />}
		</div>
	);
}

/* ─── Single media cell ─────────────────────────────────────── */
function MediaCell({
	item,
	alt,
	extraCount,
}: {
	item: PropertyMedia;
	alt: string;
	extraCount?: number;
}) {
	if (item.type === MediaType.VIDEO) {
		return (
			<div className="relative w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">
				{item.thumbnail && (
					<Image
						src={item.thumbnail}
						alt={alt}
						fill
						className="object-cover opacity-70"
					/>
				)}
				<div className="relative z-1 text-white">
					<div className="bg-white/20 rounded-full p-1.5">
						<Play className="w-4 h-4 fill-white" />
					</div>
				</div>
				{extraCount != null && (
					<div className="absolute inset-0 bg-black/55 flex items-center justify-center z-2">
						<span className="text-white font-bold text-lg">+{extraCount}</span>
					</div>
				)}
			</div>
		);
	}
	if (item.type === MediaType.AUDIO) {
		return (
			<div className="relative w-full h-full bg-linear-to-br from-violet-700 to-indigo-900 flex items-center justify-center overflow-hidden">
				<div className="bg-white/20 rounded-full p-1.5">
					<Mic className="w-4 h-4 text-white" />
				</div>
				{extraCount != null && (
					<div className="absolute inset-0 bg-black/55 flex items-center justify-center z-2">
						<span className="text-white font-bold text-lg">+{extraCount}</span>
					</div>
				)}
			</div>
		);
	}
	return (
		<div className="relative w-full h-full overflow-hidden">
			<Image
				src={item.url}
				alt={alt}
				fill
				className="object-cover"
				sizes="(max-width: 768px) 100vw, 50vw"
			/>
			{extraCount != null && (
				<div className="absolute inset-0 bg-black/55 flex items-center justify-center z-2">
					<span className="text-white font-bold text-lg">+{extraCount}</span>
				</div>
			)}
		</div>
	);
}

/* ─── Per-type slideshow ─────────────────────────────────────── */
function MediaTypeSlideshow({
	items,
	alt,
}: {
	items: PropertyMedia[];
	alt: string;
}) {
	const [idx, setIdx] = useState(0);
	const [paused, setPaused] = useState(false);

	const goNext = useCallback(
		() => setIdx((i) => (i + 1) % items.length),
		[items.length],
	);
	const goPrev = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			setIdx((i) => (i - 1 + items.length) % items.length);
		},
		[items.length],
	);

	useEffect(() => {
		if (items.length <= 1 || paused) return;
		const t = setInterval(goNext, 3500);
		return () => clearInterval(t);
	}, [items.length, paused, goNext]);

	const current = items[idx];

	return (
		<div
			className="relative w-full h-full overflow-hidden group/slide"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			{/* Slides */}
			{items.map((item, i) => (
				<div
					key={`${item.url}-${i}`}
					className={`absolute inset-0 transition-opacity duration-400 ${
						i === idx ? "opacity-100 z-1" : "opacity-0 z-0"
					}`}
				>
					{item.type === MediaType.VIDEO ? (
						<div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
							{item.thumbnail && (
								<Image
									src={item.thumbnail}
									alt={alt}
									fill
									className="object-cover opacity-60"
								/>
							)}
							<div className="relative z-1 flex flex-col items-center gap-1 text-white">
								<div className="bg-white/20 rounded-full p-1.5">
									<Play className="w-4 h-4 fill-white" />
								</div>
							</div>
						</div>
					) : item.type === MediaType.AUDIO ? (
						<div className="w-full h-full bg-linear-to-br from-violet-700 to-indigo-900 flex items-center justify-center">
							<div className="bg-white/20 rounded-full p-1.5">
								<Mic className="w-4 h-4 text-white" />
							</div>
						</div>
					) : (
						<Image
							src={item.url}
							alt={`${alt} ${i + 1}`}
							fill
							className="object-cover"
							sizes="(max-width: 768px) 100vw, 50vw"
						/>
					)}
				</div>
			))}

			{/* Type label + count — top-left */}
			<div className="absolute top-1.5 left-1.5 z-2 flex items-center gap-1">
				<div className="bg-black/50 text-white rounded px-1.5 py-0.5 typo-badge font-semibold uppercase tracking-wide flex items-center gap-1">
					{current.type === MediaType.VIDEO && (
						<Play className="w-2.5 h-2.5 fill-white" />
					)}
					{current.type === MediaType.AUDIO && <Mic className="w-2.5 h-2.5" />}
					{items.length > 1 ? `${idx + 1}/${items.length}` : current.type}
				</div>
			</div>

			{/* Prev / Next */}
			{items.length > 1 && (
				<>
					<button
						type="button"
						onClick={goPrev}
						className="absolute left-1 top-1/2 -translate-y-1/2 z-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover/slide:opacity-100 transition-opacity"
						aria-label="Previous"
					>
						<ChevronLeft className="w-3 h-3" />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							goNext();
						}}
						className="absolute right-1 top-1/2 -translate-y-1/2 z-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover/slide:opacity-100 transition-opacity"
						aria-label="Next"
					>
						<ChevronRight className="w-3 h-3" />
					</button>
				</>
			)}
		</div>
	);
}

/* ─── Media grid (one cell per type) ─────────────────────────── */
function PropertyMediaGrid({ property }: { property: Property }) {
	const allMedia = getPropertyMedia(property);
	const built = hasBuildingFootprint(property);
	const areaLabel =
		property.area != null ? `${property.area.toLocaleString()} sqm` : "—";

	// Group by type
	const byType: Record<string, PropertyMedia[]> = {};
	for (const item of allMedia) {
		(byType[item.type] ??= []).push(item);
	}
	const groups = Object.entries(byType) as [string, PropertyMedia[]][];

	if (groups.length === 0) {
		return (
			<div className="relative h-12 overflow-hidden">
				<PropertyPlaceholderSvg
					seed={property.id || property.name}
					hasBuilding={built}
					className="absolute inset-0 opacity-70"
				/>
				<div className="absolute right-3 top-1/2 -translate-y-1/2 z-2">
					<div className="rounded-full bg-white/95 px-2.5 py-0.5 typo-badge font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
						{areaLabel}
					</div>
				</div>
			</div>
		);
	}

	const n = groups.length;
	// Sort so audio is always last (rightmost / bottom)
	const sorted = [...groups].sort(([a], [b]) => {
		if (a === MediaType.AUDIO) return 1;
		if (b === MediaType.AUDIO) return -1;
		return 0;
	});
	// When audio is one of the columns, give it less space
	const hasAudio = groups.some(([t]) => t === MediaType.AUDIO);

	return (
		<div className="relative h-64 overflow-hidden">
			{n === 1 ? (
				<MediaTypeSlideshow items={sorted[0][1]} alt={property.name} />
			) : n === 2 ? (
				<div
					className={`grid h-full gap-px bg-border ${hasAudio ? "grid-cols-[3fr_1fr]" : "grid-cols-2"}`}
				>
					{sorted.map(([, items]) => (
						<MediaTypeSlideshow
							key={items[0].type}
							items={items}
							alt={property.name}
						/>
					))}
				</div>
			) : (
				/* 3 types: big left + 2 stacked right; audio gets smaller share */
				<div className="grid grid-cols-[2fr_1fr] h-full gap-px bg-border">
					<MediaTypeSlideshow items={sorted[0][1]} alt={property.name} />
					<div className="flex flex-col gap-px">
						{sorted.slice(1).map(([type, items]) => (
							<div
								key={type}
								className={
									type === MediaType.AUDIO
										? "flex-[0_0_30%] min-h-0"
										: "flex-1 min-h-0"
								}
							>
								<MediaTypeSlideshow items={items} alt={property.name} />
							</div>
						))}
					</div>
				</div>
			)}

			{/* Area badge */}
			<div className="absolute right-3 bottom-3 z-3 pointer-events-none">
				<div className="rounded-full bg-white/92 px-2.5 py-1 typo-badge font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
					{areaLabel}
				</div>
			</div>
		</div>
	);
}

/* ─── Tight all-items grid (one cell per item, up to 4) ─────── */
function PropertyMediaTightGrid({ property }: { property: Property }) {
	const allMedia = getPropertyMedia(property);
	const built = hasBuildingFootprint(property);
	const areaLabel =
		property.area != null ? `${property.area.toLocaleString()} sqm` : "—";

	if (allMedia.length === 0) {
		return (
			<div className="relative h-12 overflow-hidden">
				<PropertyPlaceholderSvg
					seed={property.id || property.name}
					hasBuilding={built}
					className="absolute inset-0 opacity-70"
				/>
				<div className="absolute right-3 top-1/2 -translate-y-1/2 z-2">
					<div className="rounded-full bg-white/95 px-2.5 py-0.5 typo-badge font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
						{areaLabel}
					</div>
				</div>
			</div>
		);
	}

	const MAX_CELLS = 4;
	const visible = allMedia.slice(0, MAX_CELLS);
	const overflow =
		allMedia.length > MAX_CELLS ? allMedia.length - MAX_CELLS : 0;
	const count = visible.length;

	return (
		<div className="relative h-64 overflow-hidden">
			{count === 1 ? (
				<MediaCell item={visible[0]} alt={property.name} />
			) : count === 2 ? (
				<div
					className={`grid h-full gap-px bg-border ${
						visible[1].type === MediaType.AUDIO ||
						visible[0].type === MediaType.AUDIO
							? visible[0].type === MediaType.AUDIO
								? "grid-cols-[1fr_3fr]"
								: "grid-cols-[3fr_1fr]"
							: "grid-cols-2"
					}`}
				>
					{visible.map((item, i) => (
						<MediaCell
							key={item.url}
							item={item}
							alt={`${property.name} ${i + 1}`}
							extraCount={i === 1 && overflow > 0 ? overflow : undefined}
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-[2fr_1fr] h-full gap-px bg-border">
					<MediaCell item={visible[0]} alt={`${property.name} 1`} />
					<div className="flex flex-col gap-px">
						{visible.slice(1).map((item, i) => {
							const isLast = i === visible.slice(1).length - 1;
							return (
								<div
									key={item.url}
									className={
										item.type === MediaType.AUDIO
											? "flex-[0_0_28%] min-h-0"
											: "flex-1 min-h-0"
									}
								>
									<MediaCell
										item={item}
										alt={`${property.name} ${i + 2}`}
										extraCount={isLast && overflow > 0 ? overflow : undefined}
									/>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Area badge */}
			<div className="absolute right-3 bottom-3 z-3 pointer-events-none">
				<div className="rounded-full bg-white/92 px-2.5 py-1 typo-badge font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
					{areaLabel}
				</div>
			</div>
		</div>
	);
}

function PropertyCard({
	property,
	onSelect,
	sharedFrom,
	canEdit = true,
	onStatusToggle,
	statusTogglePending = false,
	mediaView = "typed",
	parentName,
}: {
	property: Property;
	onSelect: (id: string) => void;
	sharedFrom?: string | null;
	canEdit?: boolean;
	onStatusToggle?: (id: string, newStatus: PropertyStatus) => void;
	statusTogglePending?: boolean;
	mediaView?: "typed" | "tight" | "slideshow";
	parentName?: string;
}) {
	// `property.documents` is already hydrated from the unified AIDocument
	// collection on the server, so it's the single source of truth for counts.
	const docCount = property.documents?.length ?? 0;
	const hasWorth = property.currentValue != null;
	const worthChange =
		hasWorth && (property.purchasePrice ?? 0) > 0
			? ((property.currentValue! - property.purchasePrice!) /
					property.purchasePrice!) *
				100
			: null;

	const allMedia = getPropertyMedia(property);
	const isUnit = !!property.parentPropertyId;

	return (
		<div
			onClick={() => onSelect(property.id)}
			className="w-full max-w-xl bg-card border border-border rounded-xl overflow-hidden transition-all cursor-pointer group card-hover"
		>
			{/* ── Media area ── */}
			<div className="relative">
				{mediaView === "typed" ? (
					<PropertyMediaGrid property={property} />
				) : mediaView === "tight" ? (
					<PropertyMediaTightGrid property={property} />
				) : (
					/* unified slideshow across all media */
					<div className={allMedia.length > 0 ? "h-64" : "h-12"}>
						{allMedia.length > 0 ? (
							<MediaTypeSlideshow items={allMedia} alt={property.name} />
						) : (
							<div className="relative h-full">
								<PropertyPlaceholderSvg
									seed={property.id || property.name}
									hasBuilding={hasBuildingFootprint(property)}
									className="absolute inset-0 opacity-70"
								/>
							</div>
						)}
					</div>
				)}
			</div>

			{/* ── Body ── */}
			<div className="p-5">
				{/* Header */}
				<div className="flex items-start justify-between mb-3 gap-3">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-on-surface text-base truncate">
							{parentName && property.name.startsWith(`${parentName} — `)
								? property.name.slice(parentName.length + 3)
								: property.name}
						</h3>
						<div className="flex items-center gap-1 mt-1 text-outline text-sm">
							<MapPin className="w-3 h-3 shrink-0" />
							<span className="truncate">
								{property.address || "No address"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						{canEdit && (
							<Link
								href={`/portfolio/properties/${property.id}/edit?from=list`}
								onClick={(e) => e.stopPropagation()}
								title="Edit property"
								className="p-1.5 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high opacity-0 group-hover:opacity-100 transition-all"
							>
								<Pencil className="w-3.5 h-3.5" />
							</Link>
						)}
					</div>
				</div>

				{/* Shared portfolio badge */}
				{sharedFrom && (
					<div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
						<Users className="w-3 h-3 text-indigo-500 shrink-0" />
						<span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 truncate">
							Shared from {sharedFrom}
						</span>
					</div>
				)}

				{/* Status · Type */}
				<div className="flex items-center gap-1.5 mb-3">
					{property.status && canEdit && onStatusToggle ? (
						<div onClick={(e) => e.stopPropagation()}>
							<StatusToggle
								property={property}
								onToggle={(newStatus) => onStatusToggle(property.id, newStatus)}
								isPending={statusTogglePending}
							/>
						</div>
					) : (
						property.status && (
							<>
								<span
									className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(property.status)}`}
								/>
								<span className="text-[11px] font-medium uppercase tracking-wide text-outline">
									{property.status.replace(/_/g, " ")}
								</span>
							</>
						)
					)}
					{property.status && property.propertyType && (
						<span className="text-[11px] font-medium uppercase tracking-wide text-outline-variant mx-0.5">
							·
						</span>
					)}
					{property.propertyType && (
						<span className="text-[11px] font-medium uppercase tracking-wide text-outline">
							{getTypeLabel(property.propertyType)}
						</span>
					)}
				</div>

				{/* Condition Tags */}
				{property.conditions && property.conditions.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-4">
						{property.conditions.map((condition) => (
							<span
								key={condition}
								className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${CONDITION_COLORS[condition as PropertyCondition] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
							>
								{CONDITION_LABELS[condition as PropertyCondition] ?? condition}
							</span>
						))}
					</div>
				)}

				{/* Stats grid */}
				<div className="grid grid-cols-2 gap-3 mb-4">
					<div>
						<div className="text-xs text-outline mb-0.5">Purchase Price</div>
						<div className="text-sm font-semibold text-on-surface">
							{property.purchasePrice != null ? (
								<AbbreviatedNumber
									mode="currency"
									country={property.country}
									value={property.purchasePrice}
								/>
							) : (
								"—"
							)}
						</div>
					</div>
					<div>
						<div className="text-xs text-outline mb-0.5">Current Worth</div>
						<div className="flex items-center gap-1">
							<span className="text-sm font-semibold text-on-surface">
								{hasWorth ? (
									<AbbreviatedNumber
										mode="currency"
										country={property.country}
										value={property.currentValue!}
									/>
								) : (
									"—"
								)}
							</span>
							{worthChange !== null && (
								<span
									className={`text-xs font-medium ${worthChange >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{worthChange >= 0 ? "+" : ""}
									{worthChange.toFixed(1)}%
								</span>
							)}
						</div>
					</div>
					<div>
						<div className="text-xs text-outline mb-0.5">Area</div>
						<div className="text-sm font-medium text-on-surface-variant">
							{property.area != null ? (
								<AbbreviatedNumber mode="area" value={property.area} />
							) : (
								"—"
							)}
						</div>
					</div>
					<div>
						<div className="text-xs text-outline mb-0.5">Purchase Date</div>
						<div className="flex items-center gap-1 text-sm font-medium text-on-surface-variant">
							<Calendar className="w-3 h-3" />
							{property.purchaseDate ? formatDate(property.purchaseDate) : "—"}
						</div>
					</div>
					{(property.quantity ?? 1) > 1 && (
						<div>
							<div className="text-xs text-outline mb-0.5">Quantity</div>
							<div className="text-sm font-medium text-violet-700">
								{property.quantity} units
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between pt-3 border-t border-divider">
					<div className="flex items-center gap-1.5 text-outline text-xs">
						<FileText className="w-3.5 h-3.5" />
						<span>
							{docCount} document{docCount !== 1 ? "s" : ""}
						</span>
					</div>
					{property.boughtFrom && (
						<div className="text-xs text-outline truncate max-w-[180px]">
							From:{" "}
							<span className="text-on-surface-variant">
								{property.boughtFrom}
							</span>
						</div>
					)}
				</div>

				{/* Parent estate breadcrumb */}
				{isUnit && parentName && (
					<div className="mt-3 pt-3 border-t border-divider flex items-center gap-1.5 text-xs text-outline">
						<Layers className="w-3 h-3 shrink-0" />
						<span>
							Part of{" "}
							<span className="font-medium text-on-surface-variant">
								{parentName}
							</span>
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

export default function PropertiesPage() {
	const { user, loading: authLoading } = useRequireAuth();
	const { activePortfolio, activePermissions } = usePortfolio();
	const queryClient = useQueryClient();
	const isExternalPortfolio =
		!!activePortfolio && activePortfolio.createdBy !== user?.id;
	const sharedPortfolioName = isExternalPortfolio ? activePortfolio.name : null;
	const {
		data: rawProperties = [],
		isLoading: loading,
		error: queryError,
	} = useMyProperties(
		user?.id,
		activePortfolio?.id,
		activePortfolio?.createdBy === user?.id,
	);
	const properties = useMemo(
		() => rawProperties.map(hydratePropertyPreview),
		[rawProperties],
	);
	const error = queryError ? "Failed to load properties" : null;
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const updateProperty = useUpdateProperty();
	const deleteProperty = useDeleteProperty();
	const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

	const handleDeleteProperty = useCallback(
		(id: string, name: string) => {
			if (
				!window.confirm(
					`Delete “${name}”? This cannot be undone.`,
				)
			) {
				return;
			}
			deleteProperty.mutate(id, {
				onSuccess: () => {
					setSelectedId((sel) => (sel === id ? null : sel));
				},
			});
		},
		[deleteProperty],
	);

	function handleStatusToggle(id: string, newStatus: PropertyStatus) {
		setPendingToggleId(id);
		updateProperty.mutate(
			{ id, updates: { status: newStatus } },
			{ onSettled: () => setPendingToggleId(null) },
		);
	}

	// Search & filter state
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState<string>("");
	const [filterStatus, setFilterStatus] = useState<string>("");
	const [containment, setContainment] = usePersistedState<
		"all" | "standalone" | "containers" | "units"
	>("plotfolio:properties:containment", "all", {
		validate: (v): v is "all" | "standalone" | "containers" | "units" =>
			v === "all" || v === "standalone" || v === "containers" || v === "units",
	});
	const [groupMode, setGroupMode] = usePersistedState<"flat" | "grouped">(
		"plotfolio:properties:groupMode",
		"grouped",
		{
			validate: (v): v is "flat" | "grouped" => v === "flat" || v === "grouped",
		},
	);
	const [sortBy, setSortBy] = useState<string>("newest");
	const [viewMode, setViewMode] = usePersistedState<"card" | "table">(
		"plotfolio:properties:viewMode",
		"card",
		{
			validate: (v): v is "card" | "table" => v === "card" || v === "table",
		},
	);
	const [mediaView, setMediaView] = usePersistedState<
		"typed" | "tight" | "slideshow"
	>("plotfolio:properties:mediaView", "typed", {
		validate: (v): v is "typed" | "tight" | "slideshow" =>
			v === "typed" || v === "tight" || v === "slideshow",
	});
	const animate = useAnimateOnce("properties");
	// Suppress skeleton flicker for fast / empty fetches (e.g. brand new accounts).
	const showSkeleton = useDelayedFlag(authLoading || !user || loading, 250);

	// Estate awareness for table view: map every parent id to its children
	// (computed from the full unfiltered list so aggregation is stable even
	// when child rows are hidden by the grouping filter).
	const childrenByParent = useMemo(() => {
		const map = new Map<string, Property[]>();
		for (const p of properties) {
			if (!p.parentPropertyId) continue;
			const arr = map.get(p.parentPropertyId);
			if (arr) arr.push(p);
			else map.set(p.parentPropertyId, [p]);
		}
		return map;
	}, [properties]);

	// Which estate rows are expanded in the table view.
	const [expandedEstates, setExpandedEstates] = useState<Set<string>>(
		() => new Set(),
	);
	const toggleEstateRow = useCallback((id: string) => {
		setExpandedEstates((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// Lookup map: property id → name (used to render parent estate breadcrumb on unit cards)
	const propertyNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const p of properties) map.set(p.id, p.name);
		return map;
	}, [properties]);

	// Filtered + sorted list
	const filtered = useMemo(() => {
		let list = properties;

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					(p.address ?? "").toLowerCase().includes(q) ||
					(p.description ?? "").toLowerCase().includes(q) ||
					(p.owner?.name ?? "").toLowerCase().includes(q),
			);
		}

		if (filterType) {
			list = list.filter((p) => p.propertyType === filterType);
		}

		if (filterStatus) {
			list = list.filter((p) => p.status === filterStatus);
		}

		// Containment filter (estate vs unit vs standalone)
		if (containment === "containers") {
			list = list.filter((p) => p.isContainer);
		} else if (containment === "units") {
			list = list.filter((p) => !!p.parentPropertyId);
		} else if (containment === "standalone") {
			list = list.filter((p) => !p.isContainer && !p.parentPropertyId);
		}

		// In grouped mode, units that have a parent in the visible set are
		// folded into their parent's hover-popout and hidden from the main grid.
		if (groupMode === "grouped" && containment !== "units") {
			const containerIds = new Set(
				list.filter((p) => p.isContainer).map((p) => p.id),
			);
			list = list.filter(
				(p) => !p.parentPropertyId || !containerIds.has(p.parentPropertyId),
			);
		}

		// Sort
		list = [...list].sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return (
						new Date(b.createdAt ?? 0).getTime() -
						new Date(a.createdAt ?? 0).getTime()
					);
				case "oldest":
					return (
						new Date(a.createdAt ?? 0).getTime() -
						new Date(b.createdAt ?? 0).getTime()
					);
				case "recently_updated":
					return (
						new Date(b.updatedAt ?? 0).getTime() -
						new Date(a.updatedAt ?? 0).getTime()
					);
				case "name_asc":
					return a.name.localeCompare(b.name);
				case "name_desc":
					return b.name.localeCompare(a.name);
				case "value_high":
					return (b.currentValue ?? 0) - (a.currentValue ?? 0);
				case "value_low":
					return (a.currentValue ?? 0) - (b.currentValue ?? 0);
				case "area_high":
					return (b.area ?? 0) - (a.area ?? 0);
				case "area_low":
					return (a.area ?? 0) - (b.area ?? 0);
				case "purchase_date":
					return (
						new Date(b.purchaseDate ?? 0).getTime() -
						new Date(a.purchaseDate ?? 0).getTime()
					);
				default:
					return 0;
			}
		});

		return list;
	}, [
		properties,
		search,
		filterType,
		filterStatus,
		sortBy,
		containment,
		groupMode,
	]);

	const hasActiveFilters =
		search ||
		filterType ||
		filterStatus ||
		sortBy !== "newest" ||
		containment !== "all";

	// Summary stats
	const totalValue = properties.reduce(
		(sum, p) => sum + (p.currentValue ?? p.purchasePrice ?? 0),
		0,
	);
	const totalArea = properties.reduce((sum, p) => sum + (p.area ?? 0), 0);
	const totalDocs = properties.reduce(
		(sum, p) => sum + (p.documents?.length ?? 0),
		0,
	);

	const summaryStats: Array<{
		label: string;
		value: React.ReactNode;
		fullValue?: string;
		icon: typeof Building2;
	}> = [
		{
			label: "Properties",
			value: String(properties.length),
			icon: Building2,
		},
		{
			label: "Portfolio Worth",
			value: <AbbreviatedNumber mode="currency" value={totalValue} />,
			fullValue: formatCurrencyFull(totalValue),
			icon: TrendingUp,
		},
		{
			label: "Total Area",
			value: <AbbreviatedNumber mode="area" value={totalArea} />,
			fullValue: `${totalArea.toLocaleString()} sqm`,
			icon: MapPin,
		},
		{
			label: "Documents",
			value: String(totalDocs),
			icon: FileText,
		},
	];

	if (authLoading || !user || loading) {
		return (
			<AppShell>
				{showSkeleton ? (
					<PropertiesPageSkeleton
						header={
							<PageHero
								icon={Home}
								title="My Properties"
								description="Manage your properties — documents, valuations, and transaction records"
							/>
						}
					/>
				) : null}
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
							<Home className="w-5 h-5 text-secondary" />
							<h1 className="font-headline typo-page-title font-extrabold tracking-tighter text-primary">
								My Properties
							</h1>
						</div>
						<p className="typo-body text-on-surface-variant ml-8">
							Manage your properties — documents, valuations, and transaction
							records
						</p>
					</div>
					{!loading && properties.length > 0 && (
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
										fullValue={stat.fullValue}
										icon={stat.icon}
									/>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Search & filter bar */}
				{!loading && properties.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
						{/* Search */}
						<div className="relative flex-1 min-w-[180px] sm:min-w-[220px] max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
							<input
								type="text"
								placeholder="Search name, address, owner…"
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

						{/* Type filter */}
						<div className="relative">
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer"
							>
								<option value="">All Types</option>
								{Object.values(PropertyType).map((t) => (
									<option key={t} value={t}>
										{getTypeLabel(t)}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>

						{/* Status filter */}
						<div className="relative">
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer"
							>
								<option value="">All Statuses</option>
								{Object.values(PropertyStatus).map((s) => (
									<option key={s} value={s}>
										{s
											.replace(/_/g, " ")
											.replace(/\b\w/g, (c) => c.toUpperCase())}
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
								<option value="recently_updated">Recently Updated</option>
								<option value="name_asc">Name A–Z</option>
								<option value="name_desc">Name Z–A</option>
								<option value="value_high">Value: High to Low</option>
								<option value="value_low">Value: Low to High</option>
								<option value="area_high">Area: Largest</option>
								<option value="area_low">Area: Smallest</option>
								<option value="purchase_date">Purchase Date</option>
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>

						{/* Containment filter */}
						<div className="flex items-center rounded-md border border-border bg-card p-0.5">
							{(
								[
									{ k: "all", label: "All" },
									{ k: "containers", label: "Estates" },
									{ k: "units", label: "Units" },
									{ k: "standalone", label: "Standalone" },
								] as const
							).map((o) => (
								<button
									key={o.k}
									type="button"
									onClick={() => setContainment(o.k)}
									className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-sm transition-colors ${
										containment === o.k
											? "bg-blue-600 text-white"
											: "text-outline hover:text-on-surface-variant"
									}`}
									title={`Show ${o.label}`}
								>
									{o.label}
								</button>
							))}
						</div>

						{/* Group toggle (only meaningful when not filtered to units) */}
						{containment !== "units" && (
							<button
								type="button"
								onClick={() =>
									setGroupMode(groupMode === "grouped" ? "flat" : "grouped")
								}
								className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1.5 rounded-md border transition-colors ${
									groupMode === "grouped"
										? "bg-blue-600 text-white border-blue-600"
										: "bg-card text-outline border-border hover:text-on-surface-variant"
								}`}
								title={
									groupMode === "grouped"
										? "Units are folded under their estate"
										: "Showing every property flat"
								}
							>
								{groupMode === "grouped" ? "Grouped" : "Flat"}
							</button>
						)}

						{/* Clear filters */}
						{hasActiveFilters && (
							<button
								onClick={() => {
									setSearch("");
									setFilterType("");
									setFilterStatus("");
									setSortBy("newest");
									setContainment("all");
								}}
								className="text-xs text-outline hover:text-primary underline underline-offset-2"
							>
								Clear filters
							</button>
						)}

						{/* View + media toggles */}
						<div className="ml-auto flex items-center gap-2">
							{viewMode === "card" && (
								<div className="flex items-center rounded-md border border-border bg-card p-0.5">
									<button
										onClick={() => setMediaView("typed")}
										className={`p-1.5 rounded-sm transition-colors ${
											mediaView === "typed"
												? "bg-blue-600 text-white"
												: "text-outline hover:text-on-surface-variant"
										}`}
										title="Grouped by type"
									>
										<LayoutPanelTop className="w-4 h-4" />
									</button>
									<button
										onClick={() => setMediaView("tight")}
										className={`p-1.5 rounded-sm transition-colors ${
											mediaView === "tight"
												? "bg-blue-600 text-white"
												: "text-outline hover:text-on-surface-variant"
										}`}
										title="All items grid"
									>
										<LayoutGrid className="w-4 h-4" />
									</button>
									<button
										onClick={() => setMediaView("slideshow")}
										className={`p-1.5 rounded-sm transition-colors ${
											mediaView === "slideshow"
												? "bg-blue-600 text-white"
												: "text-outline hover:text-on-surface-variant"
										}`}
										title="Slideshow"
									>
										<Play className="w-4 h-4" />
									</button>
								</div>
							)}
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
									<List className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* States */}
				{loading && showSkeleton && <PropertyGridSkeleton count={6} />}

				{error && <div className="text-center py-16 text-red-500">{error}</div>}

				{!loading && !error && properties.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16 gap-4 text-outline">
						<p className="text-center">
							No properties found. Add your first property to get started.
						</p>
						<PrimaryButton href="/portfolio/properties/new">
							<Plus className="w-4 h-4" />
							Add Property
						</PrimaryButton>
					</div>
				)}

				{!loading && properties.length > 0 && filtered.length === 0 && (
					<div className="text-center py-16 text-outline">
						No properties match your filters.
					</div>
				)}

				{!loading && filtered.length > 0 && viewMode === "card" && (
					<MasonryGrid minColWidth={370} maxColWidth={370}>
						{filtered.map((property, i) => (
							<div
								key={property.id}
								className="animate-fade-in-up"
								style={{ animationDelay: `${(i % 6) * 0.07}s` }}
							>
								{property.isContainer ? (
									<EstateCard estate={property} onSelect={setSelectedId} />
								) : (
									<PropertyCard
										property={property}
										onSelect={setSelectedId}
										sharedFrom={sharedPortfolioName}
										canEdit={activePermissions.canEditProperties}
										onStatusToggle={
											activePermissions.canEditProperties
												? handleStatusToggle
												: undefined
										}
										statusTogglePending={pendingToggleId === property.id}
										mediaView={mediaView}
										parentName={
											property.parentPropertyId
												? propertyNameById.get(property.parentPropertyId)
												: undefined
										}
									/>
								)}
							</div>
						))}
					</MasonryGrid>
				)}

				{!loading && filtered.length > 0 && viewMode === "table" && (
					<div className="overflow-x-auto rounded-xl border border-border bg-card">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-divider bg-surface-container/60 text-left text-xs font-semibold uppercase tracking-wider text-outline">
									<th className="px-4 py-3">Name</th>
									<th className="px-4 py-3">Address</th>
									<th className="px-4 py-3">Type</th>
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3 text-right">Area</th>
									<th className="px-4 py-3 text-right">Purchase Price</th>
									<th className="px-4 py-3 text-right">Current Worth</th>
									<th className="px-4 py-3 text-right">Qty</th>
									<th className="px-4 py-3 text-right">Docs</th>
									<th className="px-4 py-3 w-10">
										<span className="sr-only">Delete</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-divider">
								{filtered.flatMap((property) => {
									const rows: React.ReactNode[] = [];
									const isEstate = !!property.isContainer;
									const children = isEstate
										? (childrenByParent.get(property.id) ?? [])
										: [];
									const expanded = expandedEstates.has(property.id);
									// "Effective" values used for the row's metric columns.
									// For estates, when no manual override is provided, we
									// aggregate from children. The same zero-skip fallback
									// (currentValue → listingPrice → purchasePrice) used by
									// EstateCard keeps figures consistent across views.
									const pickValue = (u: Property) =>
										(u.currentValue && u.currentValue > 0
											? u.currentValue
											: undefined) ??
										(u.listingPrice && u.listingPrice > 0
											? u.listingPrice
											: undefined) ??
										(u.purchasePrice && u.purchasePrice > 0
											? u.purchasePrice
											: undefined);
									const childArea = children.reduce<number | null>(
										(s, c) => (c.area != null ? (s ?? 0) + c.area : s),
										null,
									);
									const childPurchase = children.reduce<number | null>(
										(s, c) =>
											c.purchasePrice && c.purchasePrice > 0
												? (s ?? 0) + c.purchasePrice
												: s,
										null,
									);
									const childWorth = children.reduce<number | null>((s, c) => {
										const v = pickValue(c);
										return v != null ? (s ?? 0) + v : s;
									}, null);
									const autoCompute =
										property.settings?.autoComputeWorth !== false;
									const autoComputeArea =
										property.settings?.autoComputeArea !== false;
									const effArea =
										isEstate && autoComputeArea && childArea != null
											? childArea
											: property.area;
									const effPurchase =
										isEstate &&
										(property.purchasePrice ?? 0) === 0 &&
										childPurchase != null
											? childPurchase
											: property.purchasePrice;
									const effWorth =
										isEstate && autoCompute && childWorth != null
											? childWorth
											: property.currentValue;
									const effQty =
										isEstate && children.length > 0
											? children.length
											: (property.quantity ?? 1) > 1
												? property.quantity
												: undefined;
									const worthChange =
										effWorth != null && (effPurchase ?? 0) > 0
											? ((effWorth - effPurchase!) / effPurchase!) * 100
											: null;

									rows.push(
										<tr
											key={property.id}
											onClick={() => setSelectedId(property.id)}
											className={`cursor-pointer transition-colors hover:bg-surface-container ${
												isEstate ? "bg-surface-container/30" : ""
											}`}
										>
											<td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">
												<span className="flex items-center gap-2">
													{isEstate && children.length > 0 ? (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																toggleEstateRow(property.id);
															}}
															className="inline-flex items-center justify-center w-5 h-5 rounded text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
															title={
																expanded ? "Collapse units" : "Expand units"
															}
															aria-label={
																expanded ? "Collapse units" : "Expand units"
															}
														>
															{expanded ? (
																<ChevronDown className="w-3.5 h-3.5" />
															) : (
																<ChevronRight className="w-3.5 h-3.5" />
															)}
														</button>
													) : (
														<span className="inline-block w-5" />
													)}
													{isEstate && (
														<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
															<Layers className="w-2.5 h-2.5" />
															<span className="text-badge font-semibold uppercase tracking-wider">
																Estate
															</span>
														</span>
													)}
													{property.name}
													{sharedPortfolioName && (
														<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
															<Users className="w-2.5 h-2.5" />
															<span className="text-badge font-medium">
																Shared
															</span>
														</span>
													)}
												</span>
											</td>
											<td className="px-4 py-3 text-on-surface-variant max-w-[200px] truncate">
												{property.address || "—"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{property.propertyType ? (
													<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant">
														{getTypeLabel(property.propertyType)}
													</span>
												) : (
													<span className="text-outline">—</span>
												)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{property.status ? (
													activePermissions.canEditProperties ? (
														<div onClick={(e) => e.stopPropagation()}>
															<StatusToggle
																property={property}
																onToggle={(newStatus) =>
																	handleStatusToggle(property.id, newStatus)
																}
																isPending={pendingToggleId === property.id}
															/>
														</div>
													) : (
														<span
															className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
														>
															{property.status.replace(/_/g, " ").toUpperCase()}
														</span>
													)
												) : (
													<span className="text-outline">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
												{effArea != null ? (
													<AbbreviatedNumber mode="area" value={effArea} />
												) : (
													"—"
												)}
											</td>
											<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
												{effPurchase != null && effPurchase > 0 ? (
													<AbbreviatedNumber
														mode="currency"
														country={property.country}
														value={effPurchase}
													/>
												) : (
													"—"
												)}
											</td>
											<td className="px-4 py-3 text-right whitespace-nowrap">
												{effWorth != null && effWorth > 0 ? (
													<span className="text-on-surface font-medium">
														<AbbreviatedNumber
															mode="currency"
															country={property.country}
															value={effWorth}
														/>
														{worthChange !== null && (
															<span
																className={`ml-1.5 text-xs ${
																	worthChange >= 0
																		? "text-green-600"
																		: "text-red-600"
																}`}
															>
																{worthChange >= 0 ? "+" : ""}
																{worthChange.toFixed(1)}%
															</span>
														)}
													</span>
												) : (
													<span className="text-outline">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-right text-outline whitespace-nowrap">
												{effQty != null ? (
													isEstate ? (
														<span className="inline-flex items-center gap-1 text-on-surface-variant">
															{effQty}
															<span className="text-badge uppercase tracking-wider">
																units
															</span>
														</span>
													) : (
														effQty
													)
												) : (
													"—"
												)}
											</td>
											<td className="px-4 py-3 text-right text-outline whitespace-nowrap">
												{property.documents?.length ?? 0}
											</td>
											<td className="px-4 py-3 text-center whitespace-nowrap">
												{activePermissions.canEditProperties && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteProperty(property.id, property.name);
														}}
														disabled={
															deleteProperty.isPending &&
															deleteProperty.variables === property.id
														}
														title="Delete property"
														className="inline-flex p-1.5 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												)}
											</td>
										</tr>,
									);

									if (isEstate && expanded && children.length > 0) {
										for (const child of children) {
											const childWorthValue = pickValue(child);
											const childWorthChange =
												childWorthValue != null &&
												(child.purchasePrice ?? 0) > 0
													? ((childWorthValue - child.purchasePrice!) /
															child.purchasePrice!) *
														100
													: null;
											rows.push(
												<tr
													key={`${property.id}-${child.id}`}
													onClick={() => setSelectedId(child.id)}
													className="cursor-pointer transition-colors hover:bg-surface-container bg-surface-container/10"
												>
													<td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
														<span className="flex items-center gap-2 pl-8">
															<span className="text-outline">↳</span>
															<span className="text-on-surface">
																{child.unitLabel || child.name}
															</span>
														</span>
													</td>
													<td className="px-4 py-3 text-on-surface-variant max-w-[200px] truncate">
														{child.address || "—"}
													</td>
													<td className="px-4 py-3 whitespace-nowrap">
														{child.propertyType ? (
															<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant">
																{getTypeLabel(child.propertyType)}
															</span>
														) : (
															<span className="text-outline">—</span>
														)}
													</td>
													<td className="px-4 py-3 whitespace-nowrap">
														{child.status ? (
															<span
																className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(child.status)}`}
															>
																{child.status.replace(/_/g, " ").toUpperCase()}
															</span>
														) : (
															<span className="text-outline">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
														{child.area != null ? (
															<AbbreviatedNumber
																mode="area"
																value={child.area}
															/>
														) : (
															"—"
														)}
													</td>
													<td className="px-4 py-3 text-right text-on-surface-variant whitespace-nowrap">
														{child.purchasePrice != null &&
														child.purchasePrice > 0 ? (
															<AbbreviatedNumber
																mode="currency"
																country={child.country}
																value={child.purchasePrice}
															/>
														) : (
															"—"
														)}
													</td>
													<td className="px-4 py-3 text-right whitespace-nowrap">
														{childWorthValue != null && childWorthValue > 0 ? (
															<span className="text-on-surface font-medium">
																<AbbreviatedNumber
																	mode="currency"
																	country={child.country}
																	value={childWorthValue}
																/>
																{childWorthChange !== null && (
																	<span
																		className={`ml-1.5 text-xs ${
																			childWorthChange >= 0
																				? "text-green-600"
																				: "text-red-600"
																		}`}
																	>
																		{childWorthChange >= 0 ? "+" : ""}
																		{childWorthChange.toFixed(1)}%
																	</span>
																)}
															</span>
														) : (
															<span className="text-outline">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-right text-outline whitespace-nowrap">
														{(child.quantity ?? 1) > 1 ? child.quantity : "—"}
													</td>
													<td className="px-4 py-3 text-right text-outline whitespace-nowrap">
														{child.documents?.length ?? 0}
													</td>
													<td className="px-4 py-3 text-center whitespace-nowrap">
														{activePermissions.canEditProperties && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	handleDeleteProperty(child.id, child.name);
																}}
																disabled={
																	deleteProperty.isPending &&
																	deleteProperty.variables === child.id
																}
																title="Delete unit"
																className="inline-flex p-1.5 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
															>
																<Trash2 className="w-3.5 h-3.5" />
															</button>
														)}
													</td>
												</tr>,
											);
										}
									}

									return rows;
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<PropertyDrawer
				propertyId={selectedId}
				onClose={() => setSelectedId(null)}
				onChange={() =>
					queryClient.invalidateQueries({
						queryKey: queryKeys.properties.my(
							user?.id ?? "",
							activePortfolio?.id,
						),
					})
				}
				sharedFrom={sharedPortfolioName}
				canEdit={activePermissions.canEditProperties}
			/>
		</AppShell>
	);
}
