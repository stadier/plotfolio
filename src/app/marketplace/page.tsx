"use client";

import { useFavourites } from "@/components/FavouritesContext";
import AppShell from "@/components/layout/AppShell";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMarketplaceListings } from "@/hooks/usePropertyQueries";
import { isPlotWordsCode, toPlotWords } from "@/lib/plotwords";
import { formatCurrency, getPropertyImageUrls } from "@/lib/utils";
import { Property, PropertyType } from "@/types/property";
import {
	Bookmark,
	ChevronDown,
	ChevronUp,
	Copy,
	MapPin,
	RotateCcw,
	Search,
	ShoppingBag,
	Tag,
	X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ─── helpers ─────────────────────────────────────────────────── */

function getTypeLabel(type: PropertyType): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getConditionLabel(c: string): string {
	return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getLocalityLabel(address?: string): string {
	if (!address) return "No location";
	return address.split(",").slice(0, 2).join(",").trim();
}

function getPrice(p: Property): number {
	return p.currentValue ?? p.purchasePrice ?? 0;
}

/* ─── count helpers ───────────────────────────────────────────── */

function buildTypeCounts(properties: Property[]): Record<string, number> {
	const counts: Record<string, number> = { "": properties.length };
	for (const p of properties) {
		counts[p.propertyType] = (counts[p.propertyType] ?? 0) + 1;
	}
	return counts;
}

function buildConditionCounts(
	properties: Property[],
): { value: string; count: number }[] {
	const map: Record<string, number> = {};
	for (const p of properties) {
		for (const c of p.conditions ?? []) {
			map[c] = (map[c] ?? 0) + 1;
		}
	}
	return Object.entries(map)
		.map(([value, count]) => ({ value, count }))
		.sort((a, b) => b.count - a.count);
}

function buildLocationCounts(
	properties: Property[],
): { label: string; value: string; count: number }[] {
	const map: Record<string, number> = {};
	for (const p of properties) {
		const loc = p.state || p.city || p.country || "";
		if (loc) map[loc] = (map[loc] ?? 0) + 1;
	}
	return Object.entries(map)
		.map(([value, count]) => ({ label: value, value, count }))
		.sort((a, b) => b.count - a.count);
}

interface PricePreset {
	label: string;
	min: number;
	max: number | null;
}

const PRICE_PRESETS: PricePreset[] = [
	{ label: "Under $1M", min: 0, max: 1_000_000 },
	{ label: "$1M – $10M", min: 1_000_000, max: 10_000_000 },
	{ label: "$10M – $50M", min: 10_000_000, max: 50_000_000 },
	{ label: "$50M – $200M", min: 50_000_000, max: 200_000_000 },
	{ label: "More than $200M", min: 200_000_000, max: null },
];

function buildPricePresetCounts(properties: Property[]): number[] {
	return PRICE_PRESETS.map((preset) => {
		return properties.filter((p) => {
			const v = getPrice(p);
			if (v < preset.min) return false;
			if (preset.max !== null && v > preset.max) return false;
			return true;
		}).length;
	});
}

/* ─── sort options ────────────────────────────────────────────── */

type SortKey = "price-asc" | "price-desc" | "area-asc" | "area-desc" | "newest";

function sortProperties(list: Property[], sortKey: SortKey): Property[] {
	const sorted = [...list];
	switch (sortKey) {
		case "price-asc":
			return sorted.sort(
				(a, b) =>
					(a.currentValue ?? a.purchasePrice ?? 0) -
					(b.currentValue ?? b.purchasePrice ?? 0),
			);
		case "price-desc":
			return sorted.sort(
				(a, b) =>
					(b.currentValue ?? b.purchasePrice ?? 0) -
					(a.currentValue ?? a.purchasePrice ?? 0),
			);
		case "area-asc":
			return sorted.sort((a, b) => (a.area ?? 0) - (b.area ?? 0));
		case "area-desc":
			return sorted.sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
		case "newest":
			return sorted.sort(
				(a, b) =>
					new Date(b.purchaseDate).getTime() -
					new Date(a.purchaseDate).getTime(),
			);
		default:
			return sorted;
	}
}

/* ─── listing card ────────────────────────────────────────────── */

function ListingCard({
	property,
	onSelect,
	isFavourite,
	onToggleFavourite,
}: {
	property: Property;
	onSelect: (id: string) => void;
	isFavourite: boolean;
	onToggleFavourite: (id: string) => void;
}) {
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
	const imageCandidates = getPropertyImageUrls(property).filter(
		(image): image is string => Boolean(image),
	);
	const [imageIndex, setImageIndex] = useState(0);
	const heroImage = imageCandidates[imageIndex];
	const showHeroImage = Boolean(heroImage);
	const isFeatured =
		askingPrice > 20_000_000 ||
		property.propertyType === PropertyType.COMMERCIAL;

	useEffect(() => {
		setImageIndex(0);
	}, [property.id]);

	return (
		<div
			className="w-full bg-card border border-border rounded-2xl overflow-hidden transition-all cursor-pointer group hover:shadow-lg hover:border-gray-300"
			onClick={() => onSelect(property.id)}
		>
			{/* Image area */}
			<div className="relative h-48 bg-linear-to-br from-[#eef3ea] via-[#f7f4ec] to-[#dde7dd] overflow-hidden">
				{showHeroImage ? (
					<Image
						src={heroImage}
						alt={property.name}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 280px"
						onError={() => {
							setImageIndex((current) =>
								Math.min(current + 1, imageCandidates.length),
							);
						}}
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center">
						<svg
							viewBox="0 0 200 140"
							className="w-3/4 h-3/4 opacity-60"
							fill="none"
							aria-hidden="true"
						>
							<rect
								x="12"
								y="12"
								width="70"
								height="50"
								rx="10"
								fill="#F9FBF7"
							/>
							<rect
								x="92"
								y="12"
								width="96"
								height="50"
								rx="10"
								fill="#DDE8D8"
							/>
							<rect
								x="12"
								y="72"
								width="82"
								height="50"
								rx="10"
								fill="#C7D9C5"
							/>
							<rect
								x="104"
								y="72"
								width="84"
								height="50"
								rx="10"
								fill="#E8DCC8"
							/>
							<path d="M0 68H200" stroke="#FFF" strokeWidth="6" />
							<path d="M88 0V140" stroke="#FFF" strokeWidth="5" />
						</svg>
					</div>
				)}

				{/* Bookmark / Favourite */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavourite(property.id);
					}}
					className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
						isFavourite
							? "bg-blue-600 text-white"
							: "bg-white/80 text-outline hover:text-red-500"
					}`}
				>
					<Bookmark
						className="w-4 h-4"
						fill={isFavourite ? "currentColor" : "none"}
					/>
				</button>

				{/* Featured badge */}
				{isFeatured && (
					<div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-blue-600 text-white typo-badge font-bold uppercase tracking-widest shadow-sm">
						Featured
					</div>
				)}
			</div>

			{/* Info */}
			<div className="px-4 pt-3 pb-4">
				<h3 className="font-semibold text-sm text-on-surface truncate mb-2">
					{property.name}
				</h3>
				<div className="flex items-center gap-1 text-outline text-xs mb-1">
					<MapPin className="w-3 h-3 shrink-0" />
					<span className="truncate">{getLocalityLabel(property.address)}</span>
				</div>
				{property.area != null && (
					<div className="text-xs text-outline mb-3">
						{property.area.toLocaleString()} sqm
					</div>
				)}
				{/* Price row */}
				<div className="flex items-center gap-1.5 mb-3">
					<Tag className="w-3.5 h-3.5 text-outline" />
					<span className="text-sm font-bold text-on-surface">
						{formatCurrency(askingPrice, property.country)}
					</span>
					{(property.quantity ?? 1) > 1 && (
						<span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
							<Copy className="w-3 h-3" />
							{property.quantity} available
						</span>
					)}
				</div>
				{/* Seller info */}
				<div className="pt-3 border-t border-divider">
					<UserAvatar
						name={property.owner?.name || "Unknown"}
						displayName={property.owner?.displayName}
						username={property.owner?.username}
						avatar={property.owner?.avatar}
						ownerId={property.owner?.id}
						size="sm"
						showLabel
					/>
				</div>
			</div>
		</div>
	);
}

/* ─── collapsible section ─────────────────────────────────────── */

function FilterSection({
	title,
	defaultOpen = true,
	onClear,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	onClear?: () => void;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="bg-card border border-border rounded-xl overflow-hidden">
			<button
				onClick={() => setOpen((o) => !o)}
				className="flex items-center justify-between w-full px-4 py-3"
			>
				<h4 className="text-sm font-bold text-on-surface">{title}</h4>
				<div className="flex items-center gap-2">
					{onClear && (
						<span
							onClick={(e) => {
								e.stopPropagation();
								onClear();
							}}
							className="typo-badge text-outline hover:text-blue-600 font-semibold uppercase tracking-wider cursor-pointer"
						>
							Clear
						</span>
					)}
					{open ? (
						<ChevronUp className="w-3.5 h-3.5 text-outline" />
					) : (
						<ChevronDown className="w-3.5 h-3.5 text-outline" />
					)}
				</div>
			</button>
			{open && <div className="px-4 pb-4">{children}</div>}
		</div>
	);
}

/* ─── filter sidebar ──────────────────────────────────────────── */

function FilterSidebar({
	minPrice,
	maxPrice,
	onMinPriceChange,
	onMaxPriceChange,
	onPricePresetSelect,
	activePricePreset,
	sortKey,
	onSortChange,
	search,
	onSearchChange,
	totalListings,
	onReset,
	conditionCounts,
	selectedConditions,
	onToggleCondition,
	locationCounts,
	selectedLocation,
	onSelectLocation,
	pricePresetCounts,
}: {
	minPrice: string;
	maxPrice: string;
	onMinPriceChange: (v: string) => void;
	onMaxPriceChange: (v: string) => void;
	onPricePresetSelect: (idx: number) => void;
	activePricePreset: number | null;
	sortKey: SortKey;
	onSortChange: (v: SortKey) => void;
	search: string;
	onSearchChange: (v: string) => void;
	totalListings: number;
	onReset: () => void;
	conditionCounts: { value: string; count: number }[];
	selectedConditions: Set<string>;
	onToggleCondition: (c: string) => void;
	locationCounts: { label: string; value: string; count: number }[];
	selectedLocation: string;
	onSelectLocation: (loc: string) => void;
	pricePresetCounts: number[];
}) {
	return (
		<div className="w-full space-y-3">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
				<input
					type="text"
					placeholder="Search or enter PlotWords…"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="w-full pl-9 pr-8 py-2.5 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
				/>
				{search && (
					<button
						onClick={() => onSearchChange("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-outline hover:text-on-surface-variant"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Location */}
			{locationCounts.length > 0 && (
				<FilterSection
					title="Location"
					onClear={selectedLocation ? () => onSelectLocation("") : undefined}
				>
					<div className="flex flex-col gap-1">
						<button
							onClick={() => onSelectLocation("")}
							className={`flex items-center justify-between text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
								!selectedLocation
									? "bg-blue-50 text-blue-700 font-semibold"
									: "text-on-surface-variant hover:bg-surface-container"
							}`}
						>
							<span>All Locations</span>
							<span className="typo-badge text-outline">{totalListings}</span>
						</button>
						{locationCounts.map((loc) => (
							<button
								key={loc.value}
								onClick={() => onSelectLocation(loc.value)}
								className={`flex items-center justify-between text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
									selectedLocation === loc.value
										? "bg-blue-50 text-blue-700 font-semibold"
										: "text-on-surface-variant hover:bg-surface-container"
								}`}
							>
								<span className="truncate mr-2">{loc.label}</span>
								<span
									className={`typo-badge shrink-0 ${
										selectedLocation === loc.value
											? "text-blue-500"
											: "text-outline"
									}`}
								>
									{loc.count} {loc.count === 1 ? "ad" : "ads"}
								</span>
							</button>
						))}
					</div>
				</FilterSection>
			)}

			{/* Price Range */}
			<FilterSection
				title="Price"
				onClear={
					minPrice || maxPrice || activePricePreset !== null
						? () => {
								onMinPriceChange("");
								onMaxPriceChange("");
								onPricePresetSelect(-1);
							}
						: undefined
				}
			>
				<div className="flex items-center gap-2 mb-3">
					<div className="flex-1">
						<input
							type="number"
							value={minPrice}
							onChange={(e) => onMinPriceChange(e.target.value)}
							placeholder="min"
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-surface-container focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-card"
						/>
					</div>
					<span className="text-outline-variant">—</span>
					<div className="flex-1">
						<input
							type="number"
							value={maxPrice}
							onChange={(e) => onMaxPriceChange(e.target.value)}
							placeholder="max"
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-surface-container focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-card"
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					{PRICE_PRESETS.map((preset, idx) => (
						<button
							key={preset.label}
							onClick={() => onPricePresetSelect(idx)}
							className={`flex items-center justify-between text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
								activePricePreset === idx
									? "bg-blue-50 text-blue-700 font-semibold"
									: "text-on-surface-variant hover:bg-surface-container"
							}`}
						>
							<span>{preset.label}</span>
							<span
								className={`typo-badge ${
									activePricePreset === idx ? "text-blue-500" : "text-outline"
								}`}
							>
								{pricePresetCounts[idx]}{" "}
								{pricePresetCounts[idx] === 1 ? "ad" : "ads"}
							</span>
						</button>
					))}
				</div>
			</FilterSection>

			{/* Condition */}
			{conditionCounts.length > 0 && (
				<FilterSection
					title="Condition"
					onClear={
						selectedConditions.size > 0
							? () => {
									for (const c of selectedConditions) onToggleCondition(c);
								}
							: undefined
					}
				>
					<div className="flex flex-col gap-1">
						{conditionCounts.map((item) => {
							const active = selectedConditions.has(item.value);
							return (
								<button
									key={item.value}
									onClick={() => onToggleCondition(item.value)}
									className={`flex items-center justify-between text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
										active
											? "bg-blue-50 text-blue-700 font-semibold"
											: "text-on-surface-variant hover:bg-surface-container"
									}`}
								>
									<span className="flex items-center gap-2">
										<span
											className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
												active
													? "border-blue-600 bg-blue-600"
													: "border-gray-300"
											}`}
										>
											{active && (
												<svg
													className="w-2 h-2 text-white"
													viewBox="0 0 12 12"
													fill="none"
												>
													<path
														d="M2 6l3 3 5-5"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											)}
										</span>
										{getConditionLabel(item.value)}
									</span>
									<span
										className={`typo-badge ${active ? "text-blue-500" : "text-outline"}`}
									>
										{item.count}
									</span>
								</button>
							);
						})}
					</div>
				</FilterSection>
			)}

			{/* Sort By */}
			<FilterSection title="Sort By">
				<div className="flex flex-col gap-1">
					{(
						[
							{ key: "price-desc", label: "Price: High → Low" },
							{ key: "price-asc", label: "Price: Low → High" },
							{ key: "area-desc", label: "Area: Largest" },
							{ key: "area-asc", label: "Area: Smallest" },
							{ key: "newest", label: "Newest First" },
						] as { key: SortKey; label: string }[]
					).map((opt) => (
						<button
							key={opt.key}
							onClick={() => onSortChange(opt.key)}
							className={`text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
								sortKey === opt.key
									? "bg-blue-50 text-blue-700 font-semibold"
									: "text-on-surface-variant hover:bg-surface-container"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</FilterSection>

			{/* Reset all */}
			<button
				onClick={onReset}
				className="flex items-center gap-1.5 text-[11px] text-outline hover:text-blue-600 font-semibold w-full justify-center py-2"
			>
				<RotateCcw className="w-3 h-3" />
				Reset all filters
			</button>
		</div>
	);
}

/* ─── marketplace page ────────────────────────────────────────── */

export default function MarketplacePage() {
	const {
		data: allProperties = [],
		isLoading: loading,
		error: queryError,
	} = useMarketplaceListings();
	const error = queryError ? "Failed to load marketplace listings" : null;
	const { isFavourite, toggleFavourite } = useFavourites();

	const searchParams = useSearchParams();

	// Filters
	const [search, setSearch] = useState("");

	// Seed search from URL params (?search= or ?plotwords=)
	useEffect(() => {
		const pw = searchParams.get("plotwords");
		const q = searchParams.get("search");
		if (pw) setSearch(pw);
		else if (q) setSearch(q);
	}, [searchParams]);
	const [filterType, setFilterType] = useState<string>("");
	const [sortKey, setSortKey] = useState<SortKey>("price-desc");
	const [minPrice, setMinPrice] = useState<string>("");
	const [maxPrice, setMaxPrice] = useState<string>("");
	const [selectedConditions, setSelectedConditions] = useState<Set<string>>(
		new Set(),
	);
	const [selectedLocation, setSelectedLocation] = useState<string>("");
	const [activePricePreset, setActivePricePreset] = useState<number | null>(
		null,
	);

	// Counts computed from ALL listings (before filters, so users see total stock)
	const typeCounts = useMemo(
		() => buildTypeCounts(allProperties),
		[allProperties],
	);
	const conditionCounts = useMemo(
		() => buildConditionCounts(allProperties),
		[allProperties],
	);
	const locationCounts = useMemo(
		() => buildLocationCounts(allProperties),
		[allProperties],
	);
	const pricePresetCounts = useMemo(
		() => buildPricePresetCounts(allProperties),
		[allProperties],
	);

	const filtered = useMemo(() => {
		let list = allProperties;

		if (search.trim()) {
			const q = search.trim().toLowerCase();

			// PlotWords code match — filter by exact cell
			if (isPlotWordsCode(q)) {
				list = list.filter(
					(p) =>
						p.coordinates &&
						p.coordinates.lat !== 0 &&
						p.coordinates.lng !== 0 &&
						toPlotWords(p.coordinates.lat, p.coordinates.lng) === q,
				);
			} else {
				list = list.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						(p.address ?? "").toLowerCase().includes(q) ||
						(p.description ?? "").toLowerCase().includes(q) ||
						(p.owner?.name ?? "").toLowerCase().includes(q) ||
						(p.owner?.username ?? "").toLowerCase().includes(q) ||
						(p.owner?.displayName ?? "").toLowerCase().includes(q),
				);
			}
		}

		if (filterType) {
			list = list.filter((p) => p.propertyType === filterType);
		}

		if (selectedLocation) {
			list = list.filter(
				(p) =>
					p.state === selectedLocation ||
					p.city === selectedLocation ||
					p.country === selectedLocation,
			);
		}

		if (selectedConditions.size > 0) {
			list = list.filter((p) =>
				(p.conditions ?? []).some((c) => selectedConditions.has(c)),
			);
		}

		const minP = Number(minPrice);
		const maxP = Number(maxPrice);
		if (minP > 0) {
			list = list.filter((p) => getPrice(p) >= minP);
		}
		if (maxP > 0) {
			list = list.filter((p) => getPrice(p) <= maxP);
		}

		return sortProperties(list, sortKey);
	}, [
		allProperties,
		search,
		filterType,
		sortKey,
		minPrice,
		maxPrice,
		selectedConditions,
		selectedLocation,
	]);

	const totalListings = allProperties.length;
	const hasActiveFilters =
		search ||
		filterType ||
		minPrice ||
		maxPrice ||
		selectedConditions.size > 0 ||
		selectedLocation;

	const handleSelect = (id: string) => {
		window.location.href = `/marketplace/${id}`;
	};

	const toggleCondition = useCallback((c: string) => {
		setSelectedConditions((prev) => {
			const next = new Set(prev);
			if (next.has(c)) next.delete(c);
			else next.add(c);
			return next;
		});
	}, []);

	const handlePricePreset = useCallback(
		(idx: number) => {
			if (idx < 0 || activePricePreset === idx) {
				setActivePricePreset(null);
				setMinPrice("");
				setMaxPrice("");
				return;
			}
			const preset = PRICE_PRESETS[idx];
			setActivePricePreset(idx);
			setMinPrice(String(preset.min));
			setMaxPrice(preset.max !== null ? String(preset.max) : "");
		},
		[activePricePreset],
	);

	const resetFilters = () => {
		setSearch("");
		setFilterType("");
		setMinPrice("");
		setMaxPrice("");
		setSortKey("price-desc");
		setSelectedConditions(new Set());
		setSelectedLocation("");
		setActivePricePreset(null);
	};

	// Category pills with counts
	const categoryPills = useMemo(() => {
		return [
			{ label: "All Listings", value: "", count: typeCounts[""] ?? 0 },
			...Object.values(PropertyType).map((t) => ({
				label: getTypeLabel(t),
				value: t,
				count: typeCounts[t] ?? 0,
			})),
		];
	}, [typeCounts]);

	return (
		<AppShell>
			<div className="px-4 py-4 sm:px-6 sm:py-6">
				{/* Category pills with counts */}
				<div className="flex items-center gap-2 overflow-x-auto pb-4 mb-5 scrollbar-hide">
					{categoryPills.map((cat) => (
						<button
							key={cat.value}
							onClick={() => setFilterType(cat.value)}
							className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
								filterType === cat.value
									? "bg-blue-600 text-white border-blue-600"
									: "bg-card text-on-surface-variant border-border hover:border-gray-300 hover:bg-surface-container"
							}`}
						>
							{cat.label}
							<span
								className={`ml-1.5 ${
									filterType === cat.value ? "text-blue-200" : "text-outline"
								}`}
							>
								· {cat.count}
							</span>
						</button>
					))}
				</div>

				{/* Main layout: sidebar + grid */}
				<div className="flex flex-col lg:flex-row sz-gap-section items-start">
					{/* Mobile search + sort bar */}
					<div className="lg:hidden w-full mb-4 flex flex-wrap gap-2">
						<div className="relative flex-1 min-w-[160px]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
							<input
								type="text"
								placeholder="Search or enter PlotWords…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
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
						<div className="relative">
							<select
								value={sortKey}
								onChange={(e) => setSortKey(e.target.value as SortKey)}
								className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card cursor-pointer"
							>
								<option value="newest">Newest</option>
								<option value="price-desc">Price: High</option>
								<option value="price-asc">Price: Low</option>
								<option value="area-desc">Largest</option>
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
						</div>
					</div>

					{/* Left filter sidebar */}
					<aside className="hidden lg:block w-60 shrink-0 sticky top-24">
						<FilterSidebar
							minPrice={minPrice}
							maxPrice={maxPrice}
							onMinPriceChange={(v) => {
								setMinPrice(v);
								setActivePricePreset(null);
							}}
							onMaxPriceChange={(v) => {
								setMaxPrice(v);
								setActivePricePreset(null);
							}}
							onPricePresetSelect={handlePricePreset}
							activePricePreset={activePricePreset}
							sortKey={sortKey}
							onSortChange={setSortKey}
							search={search}
							onSearchChange={setSearch}
							totalListings={totalListings}
							onReset={resetFilters}
							conditionCounts={conditionCounts}
							selectedConditions={selectedConditions}
							onToggleCondition={toggleCondition}
							locationCounts={locationCounts}
							selectedLocation={selectedLocation}
							onSelectLocation={setSelectedLocation}
							pricePresetCounts={pricePresetCounts}
						/>
					</aside>

					{/* Right content area */}
					<div className="flex-1 min-w-0">
						{/* Loading */}
						{loading && (
							<div
								className="grid gap-4"
								style={{
									gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
								}}
							>
								{[1, 2, 3, 4, 5, 6].map((i) => (
									<div
										key={i}
										className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse"
									>
										<div className="h-48 bg-surface-container-high" />
										<div className="p-4 space-y-2">
											<div className="h-4 bg-surface-container-high rounded w-3/4" />
											<div className="h-3 bg-surface-container-high rounded w-1/2" />
											<div className="h-4 bg-surface-container-high rounded w-1/3 mt-2" />
										</div>
									</div>
								))}
							</div>
						)}

						{/* Error */}
						{error && (
							<div className="text-center py-16 text-red-500">{error}</div>
						)}

						{/* Empty state */}
						{!loading && !error && totalListings === 0 && (
							<div className="text-center py-20">
								<ShoppingBag className="w-12 h-12 text-outline-variant mx-auto mb-4" />
								<h2 className="text-lg font-semibold text-on-surface-variant mb-2">
									No listings yet
								</h2>
								<p className="text-sm text-outline max-w-md mx-auto">
									There are no properties currently listed for sale. Properties
									marked as &quot;For Sale&quot; will appear here.
								</p>
							</div>
						)}

						{/* No results */}
						{!loading && totalListings > 0 && filtered.length === 0 && (
							<div className="text-center py-16">
								<p className="text-outline mb-3">
									No listings match your filters.
								</p>
								<button
									onClick={resetFilters}
									className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
								>
									<RotateCcw className="w-3 h-3" />
									Reset filters
								</button>
							</div>
						)}

						{/* Listings grid */}
						{!loading && filtered.length > 0 && (
							<>
								<div className="text-xs text-outline mb-4">
									Showing {filtered.length} listing
									{filtered.length !== 1 ? "s" : ""}
									{hasActiveFilters ? " (filtered)" : ""}
								</div>
								<div
									className="grid gap-3 sm:gap-4 items-start"
									style={{
										gridTemplateColumns:
											"repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
									}}
								>
									{filtered.map((property) => (
										<ListingCard
											key={property.id}
											property={property}
											onSelect={handleSelect}
											isFavourite={isFavourite(property.id)}
											onToggleFavourite={toggleFavourite}
										/>
									))}
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</AppShell>
	);
}
