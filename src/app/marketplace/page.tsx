"use client";

import AppShell from "@/components/layout/AppShell";
import UserAvatar from "@/components/ui/UserAvatar";
import { PropertyAPI } from "@/lib/api";
import { Property, PropertyType } from "@/types/property";
import {
	Copy,
	Heart,
	MapPin,
	RotateCcw,
	Search,
	ShoppingBag,
	Tag,
	X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

/* ─── helpers ─────────────────────────────────────────────────── */

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
	}).format(amount);
}

function getTypeLabel(type: PropertyType): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLocalityLabel(address?: string): string {
	if (!address) return "No location";
	return address.split(",").slice(0, 2).join(",").trim();
}

/* ─── category pills ─────────────────────────────────────────── */

const CATEGORIES = [
	{ label: "All Listings", value: "" },
	...Object.values(PropertyType).map((t) => ({
		label: getTypeLabel(t),
		value: t,
	})),
];

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
	const heroImage = property.images?.[0];
	const [imageUnavailable, setImageUnavailable] = useState(false);
	const showHeroImage = Boolean(heroImage) && !imageUnavailable;
	const isFeatured =
		askingPrice > 20_000_000 ||
		property.propertyType === PropertyType.COMMERCIAL;

	return (
		<div
			className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all cursor-pointer group hover:shadow-lg hover:border-gray-300"
			onClick={() => onSelect(property.id)}
		>
			{/* Image area */}
			<div className="relative h-48 bg-linear-to-br from-[#eef3ea] via-[#f7f4ec] to-[#dde7dd] overflow-hidden">
				{showHeroImage ? (
					<Image
						src={heroImage as string}
						alt={property.name}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 280px"
						onError={() => setImageUnavailable(true)}
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

				{/* Heart / Favourite */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavourite(property.id);
					}}
					className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
						isFavourite
							? "bg-blue-600 text-white"
							: "bg-white/80 text-gray-400 hover:text-red-500"
					}`}
				>
					<Heart
						className="w-4 h-4"
						fill={isFavourite ? "currentColor" : "none"}
					/>
				</button>

				{/* Featured badge */}
				{isFeatured && (
					<div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
						Featured
					</div>
				)}
			</div>

			{/* Info */}
			<div className="px-4 pt-3 pb-4">
				<h3 className="font-semibold text-sm text-gray-900 truncate mb-2 group-hover:text-black">
					{property.name}
				</h3>
				<div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
					<MapPin className="w-3 h-3 shrink-0" />
					<span className="truncate">{getLocalityLabel(property.address)}</span>
				</div>
				{property.area != null && (
					<div className="text-xs text-gray-400 mb-3">
						{property.area.toLocaleString()} sqm
					</div>
				)}
				{/* Price row */}
				<div className="flex items-center gap-1.5 mb-3">
					<Tag className="w-3.5 h-3.5 text-gray-400" />
					<span className="text-sm font-bold text-gray-900">
						{formatCurrency(askingPrice)}
					</span>
					{(property.quantity ?? 1) > 1 && (
						<span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
							<Copy className="w-3 h-3" />
							{property.quantity} available
						</span>
					)}
				</div>
				{/* Seller info */}
				<div className="pt-3 border-t border-gray-100">
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

/* ─── filter sidebar ──────────────────────────────────────────── */

function FilterSidebar({
	minPrice,
	maxPrice,
	onMinPriceChange,
	onMaxPriceChange,
	sortKey,
	onSortChange,
	search,
	onSearchChange,
	totalListings,
	onReset,
}: {
	minPrice: string;
	maxPrice: string;
	onMinPriceChange: (v: string) => void;
	onMaxPriceChange: (v: string) => void;
	sortKey: SortKey;
	onSortChange: (v: SortKey) => void;
	search: string;
	onSearchChange: (v: string) => void;
	totalListings: number;
	onReset: () => void;
}) {
	const avgPrice = totalListings > 0 ? "$15K" : "—";

	return (
		<div className="w-full space-y-5">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
				<input
					type="text"
					placeholder="Search listings…"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
				/>
				{search && (
					<button
						onClick={() => onSearchChange("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Price Range */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="flex items-center justify-between mb-1">
					<h4 className="text-sm font-bold text-gray-900">Price Range</h4>
					<button
						onClick={onReset}
						className="text-[10px] text-gray-400 hover:text-blue-600 font-semibold uppercase tracking-wider"
					>
						Reset
					</button>
				</div>
				<p className="text-[11px] text-gray-400 mb-3">
					The average price is {avgPrice}
				</p>
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
							Min ($)
						</label>
						<input
							type="number"
							value={minPrice}
							onChange={(e) => onMinPriceChange(e.target.value)}
							placeholder="0"
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
						/>
					</div>
					<span className="text-gray-300 mt-5">—</span>
					<div className="flex-1">
						<label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
							Max ($)
						</label>
						<input
							type="number"
							value={maxPrice}
							onChange={(e) => onMaxPriceChange(e.target.value)}
							placeholder="No limit"
							className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
						/>
					</div>
				</div>
			</div>

			{/* Sort By */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<h4 className="text-sm font-bold text-gray-900 mb-3">Sort By</h4>
				<div className="flex flex-col gap-1.5">
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
							className={`text-left px-3 py-2 text-xs rounded-lg transition-colors ${
								sortKey === opt.key
									? "bg-blue-50 text-blue-700 font-semibold"
									: "text-gray-600 hover:bg-gray-50"
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

/* ─── marketplace page ────────────────────────────────────────── */

export default function MarketplacePage() {
	const [allProperties, setAllProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [favourites, setFavourites] = useState<Set<string>>(new Set());

	// Filters
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState<string>("");
	const [sortKey, setSortKey] = useState<SortKey>("price-desc");
	const [minPrice, setMinPrice] = useState<string>("");
	const [maxPrice, setMaxPrice] = useState<string>("");

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);
				let data = await PropertyAPI.getMarketplaceListings();
				if (data.length === 0) {
					const all = await PropertyAPI.getAllProperties();
					data = all.filter((p) => p.status === "for_sale");
				}
				setAllProperties(data);
			} catch {
				setError("Failed to load marketplace listings");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const filtered = useMemo(() => {
		let list = allProperties;

		if (search.trim()) {
			const q = search.toLowerCase();
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

		if (filterType) {
			list = list.filter((p) => p.propertyType === filterType);
		}

		const minP = Number(minPrice);
		const maxP = Number(maxPrice);
		if (minP > 0) {
			list = list.filter(
				(p) => (p.currentValue ?? p.purchasePrice ?? 0) >= minP,
			);
		}
		if (maxP > 0) {
			list = list.filter(
				(p) => (p.currentValue ?? p.purchasePrice ?? 0) <= maxP,
			);
		}

		return sortProperties(list, sortKey);
	}, [allProperties, search, filterType, sortKey, minPrice, maxPrice]);

	const totalListings = allProperties.length;
	const hasActiveFilters = search || filterType || minPrice || maxPrice;

	const handleSelect = (id: string) => {
		window.location.href = `/marketplace/${id}`;
	};

	const toggleFavourite = (id: string) => {
		setFavourites((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const resetFilters = () => {
		setSearch("");
		setFilterType("");
		setMinPrice("");
		setMaxPrice("");
		setSortKey("price-desc");
	};

	return (
		<AppShell>
			<div className="px-6 py-6">
				{/* Category pills */}
				<div className="flex items-center gap-2 overflow-x-auto pb-4 mb-5 scrollbar-hide">
					{CATEGORIES.map((cat) => (
						<button
							key={cat.value}
							onClick={() => setFilterType(cat.value)}
							className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
								filterType === cat.value
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
							}`}
						>
							{cat.label}
						</button>
					))}
				</div>

				{/* Main layout: sidebar + grid */}
				<div className="flex gap-6 items-start">
					{/* Left filter sidebar */}
					<aside className="hidden lg:block w-56 shrink-0 sticky top-24">
						<FilterSidebar
							minPrice={minPrice}
							maxPrice={maxPrice}
							onMinPriceChange={setMinPrice}
							onMaxPriceChange={setMaxPrice}
							sortKey={sortKey}
							onSortChange={setSortKey}
							search={search}
							onSearchChange={setSearch}
							totalListings={totalListings}
							onReset={resetFilters}
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
										className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse"
									>
										<div className="h-48 bg-gray-100" />
										<div className="p-4 space-y-2">
											<div className="h-4 bg-gray-100 rounded w-3/4" />
											<div className="h-3 bg-gray-100 rounded w-1/2" />
											<div className="h-4 bg-gray-100 rounded w-1/3 mt-2" />
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
								<ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
								<h2 className="text-lg font-semibold text-gray-700 mb-2">
									No listings yet
								</h2>
								<p className="text-sm text-gray-500 max-w-md mx-auto">
									There are no properties currently listed for sale. Properties
									marked as &quot;For Sale&quot; will appear here.
								</p>
							</div>
						)}

						{/* No results */}
						{!loading && totalListings > 0 && filtered.length === 0 && (
							<div className="text-center py-16">
								<p className="text-gray-400 mb-3">
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
								<div className="text-xs text-gray-400 mb-4">
									Showing {filtered.length} listing
									{filtered.length !== 1 ? "s" : ""}
									{hasActiveFilters ? " (filtered)" : ""}
								</div>
								<div
									className="grid gap-4 items-start"
									style={{
										gridTemplateColumns:
											"repeat(auto-fill, minmax(240px, 1fr))",
									}}
								>
									{filtered.map((property) => (
										<ListingCard
											key={property.id}
											property={property}
											onSelect={handleSelect}
											isFavourite={favourites.has(property.id)}
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
