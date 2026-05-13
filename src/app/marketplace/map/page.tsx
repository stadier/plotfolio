"use client";

import AppShell from "@/components/layout/AppShell";
import MapPropertySidebar from "@/components/maps/MapPropertySidebar";
import MapSearchControl from "@/components/maps/MapSearchControl";
import PropertyFullView from "@/components/property/PropertyFullView";
import { MapPageSkeleton } from "@/components/ui/skeletons";
import { useMarketplaceListings } from "@/hooks/usePropertyQueries";
import { Property, PropertyType } from "@/types/property";
import { List, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

// Reuse the same map renderer as the portfolio map view.
const PlotfolioMap = dynamic(() => import("@/components/maps/PlotfolioMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-surface-container-highest animate-pulse flex items-center justify-center">
			<div className="text-on-surface-variant">Loading map...</div>
		</div>
	),
});

type SaleMode = "" | "for_sale" | "for_rent" | "for_lease";

const SALE_MODES: { value: SaleMode; label: string }[] = [
	{ value: "", label: "All" },
	{ value: "for_sale", label: "For Sale" },
	{ value: "for_rent", label: "For Rent" },
	{ value: "for_lease", label: "For Lease" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
	{ value: "", label: "All Types" },
	...Object.values(PropertyType).map((t) => ({
		value: t,
		label: t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
	})),
];

function getPrice(p: Property): number {
	return p.currentValue ?? p.purchasePrice ?? 0;
}

export default function MarketplaceMapPage() {
	const {
		data: listings = [],
		isLoading: loading,
		error: queryError,
	} = useMarketplaceListings();
	const error = queryError ? "Failed to load listings" : null;

	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [saleMode, setSaleMode] = useState<SaleMode>("");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [minPrice, setMinPrice] = useState<string>("");
	const [maxPrice, setMaxPrice] = useState<string>("");
	const [mapLayerType, setMapLayerType] = useState<
		"standard" | "satellite" | "terrain" | "hybrid"
	>("standard");
	const [isMounted, setIsMounted] = useState(false);
	const [showMobileSidebar, setShowMobileSidebar] = useState(false);

	const [viewport, setViewport] = useState<{
		center: [number, number];
		zoom: number;
		bounds: [[number, number], [number, number]];
	}>(() => {
		if (typeof window !== "undefined") {
			try {
				const cached = sessionStorage.getItem("plotfolio-marketplace-viewport");
				if (cached) return JSON.parse(cached);
			} catch {}
		}
		return {
			center: [20, 0] as [number, number],
			zoom: 3,
			bounds: [
				[-60, -180],
				[80, 180],
			] as [[number, number], [number, number]],
		};
	});

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		try {
			sessionStorage.setItem(
				"plotfolio-marketplace-viewport",
				JSON.stringify(viewport),
			);
		} catch {}
	}, [viewport]);

	const filteredProperties = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const minP = Number(minPrice);
		const maxP = Number(maxPrice);

		return listings.filter((p) => {
			if (saleMode && p.status !== saleMode) return false;
			if (typeFilter && p.propertyType !== typeFilter) return false;
			if (minP > 0 && getPrice(p) < minP) return false;
			if (maxP > 0 && getPrice(p) > maxP) return false;
			if (q) {
				const haystack = [
					p.name,
					p.address,
					p.description ?? "",
					p.owner?.name ?? "",
					p.owner?.username ?? "",
				]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [listings, searchQuery, saleMode, typeFilter, minPrice, maxPrice]);

	const handlePropertySelect = (property: Property) => {
		setSelectedProperty(property);
		setViewport((prev) => ({
			...prev,
			center: [property.coordinates.lat, property.coordinates.lng],
			zoom: 16,
		}));
	};

	const handleViewportChange = useCallback(
		(newViewport: {
			center: [number, number];
			zoom: number;
			bounds?: [[number, number], [number, number]];
		}) => {
			setViewport((prev) => ({ ...prev, ...newViewport }));
		},
		[],
	);

	const handleSearchLocationSelect = useCallback((lat: number, lng: number) => {
		setViewport((prev) => ({ ...prev, center: [lat, lng], zoom: 15 }));
	}, []);

	const handleLocateMe = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setViewport((prev) => ({
						...prev,
						center: [position.coords.latitude, position.coords.longitude],
						zoom: 15,
					}));
				},
				(err) => console.warn("Geolocation failed:", err.message),
				{ enableHighAccuracy: true, timeout: 10000 },
			);
		}
	}, []);

	const resetFilters = () => {
		setSaleMode("");
		setTypeFilter("");
		setMinPrice("");
		setMaxPrice("");
		setSearchQuery("");
	};

	const hasActiveFilters =
		!!saleMode || !!typeFilter || !!minPrice || !!maxPrice || !!searchQuery;

	if (loading) {
		return (
			<AppShell scrollable={false}>
				<MapPageSkeleton />
			</AppShell>
		);
	}

	if (error) {
		return (
			<AppShell scrollable={false}>
				<div className="h-full flex items-center justify-center bg-surface-container-low">
					<div className="text-center">
						<div className="text-error text-xl mb-4">⚠️ Error</div>
						<p className="text-on-surface-variant mb-4">{error}</p>
					</div>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable={false} hideAddProperty>
			<div className="flex flex-1 min-h-0 w-full relative">
				{/* Listings sidebar */}
				<div className="hidden md:block shrink-0 w-80 h-full">
					<MapPropertySidebar
						properties={filteredProperties}
						selectedPropertyId={selectedProperty?.id ?? null}
						onPropertySelect={handlePropertySelect}
						searchQuery={searchQuery}
						onSearch={setSearchQuery}
					/>
				</div>

				{/* Detail column */}
				{selectedProperty && (
					<div className="hidden md:block shrink-0 w-md h-full">
						<div className="h-full flex flex-col bg-card border-r border-border m-2 mx-1 overflow-hidden">
							<div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
								<h2 className="text-sm font-semibold text-on-surface truncate flex-1">
									{selectedProperty.name}
								</h2>
								<button
									onClick={() => setSelectedProperty(null)}
									className="w-8 h-8 rounded-md hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
									title="Close"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="flex-1 overflow-y-auto">
								<PropertyFullView
									key={selectedProperty.id}
									property={selectedProperty}
									isOwner={false}
									singleColumn
									hideHeader
								/>
							</div>
						</div>
					</div>
				)}

				{/* Mobile sidebar overlay */}
				{showMobileSidebar && (
					<div className="md:hidden absolute inset-0 z-layer-overlay flex">
						<div className="w-96 max-w-[90vw] h-full bg-card shadow-xl">
							{selectedProperty ? (
								<div className="h-full flex flex-col bg-card overflow-hidden">
									<div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
										<h2 className="text-sm font-semibold text-on-surface truncate flex-1">
											{selectedProperty.name}
										</h2>
										<button
											onClick={() => {
												setSelectedProperty(null);
												setShowMobileSidebar(false);
											}}
											className="w-8 h-8 rounded-md hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
											title="Close"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
									<div className="flex-1 overflow-y-auto">
										<PropertyFullView
											key={selectedProperty.id}
											property={selectedProperty}
											isOwner={false}
											singleColumn
											hideHeader
										/>
									</div>
								</div>
							) : (
								<MapPropertySidebar
									properties={filteredProperties}
									selectedPropertyId={null}
									onPropertySelect={(p) => {
										handlePropertySelect(p);
										setShowMobileSidebar(false);
									}}
									searchQuery={searchQuery}
									onSearch={setSearchQuery}
								/>
							)}
						</div>
						<div
							className="flex-1 bg-black/40"
							onClick={() => setShowMobileSidebar(false)}
						/>
					</div>
				)}

				{/* Map area */}
				<div className="flex-1 relative h-full">
					{/* Mobile listings toggle */}
					<button
						onClick={() => setShowMobileSidebar(true)}
						className="md:hidden absolute top-3 left-3 z-layer-map bg-card shadow-lg rounded-md px-3 py-2 flex items-center gap-2 text-sm font-medium text-on-surface border border-border"
					>
						<List className="w-4 h-4" />
						Listings
					</button>

					{/* Filter bar — top-left, max-width, wraps on small screens */}
					<div className="absolute top-3 left-3 md:left-3 right-3 md:right-auto z-layer-map flex flex-wrap items-center gap-2 max-w-2xl bg-glass backdrop-blur-md border border-border/50 rounded-md shadow-lg p-2">
						{/* Sale mode pills */}
						<div className="flex items-center gap-1">
							{SALE_MODES.map((m) => (
								<button
									key={m.value}
									onClick={() => setSaleMode(m.value)}
									className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
										saleMode === m.value
											? "bg-blue-600 text-white border-blue-600"
											: "bg-card text-on-surface-variant border-border hover:bg-surface-container"
									}`}
								>
									{m.label}
								</button>
							))}
						</div>

						{/* Type select */}
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
							className="text-[11px] px-2 py-1 rounded-md border border-border bg-card text-on-surface cursor-pointer"
						>
							{TYPE_OPTIONS.map((t) => (
								<option key={t.value} value={t.value}>
									{t.label}
								</option>
							))}
						</select>

						{/* Price range */}
						<div className="flex items-center gap-1">
							<input
								type="number"
								inputMode="numeric"
								placeholder="Min $"
								value={minPrice}
								onChange={(e) => setMinPrice(e.target.value)}
								className="w-20 text-[11px] px-2 py-1 rounded-md border border-border bg-card text-on-surface"
							/>
							<span className="text-outline text-[11px]">–</span>
							<input
								type="number"
								inputMode="numeric"
								placeholder="Max $"
								value={maxPrice}
								onChange={(e) => setMaxPrice(e.target.value)}
								className="w-20 text-[11px] px-2 py-1 rounded-md border border-border bg-card text-on-surface"
							/>
						</div>

						{/* Result count */}
						<span className="text-[11px] text-on-surface-variant px-1">
							{filteredProperties.length} of {listings.length}
						</span>

						{hasActiveFilters && (
							<button
								onClick={resetFilters}
								className="text-[11px] text-blue-600 hover:underline font-semibold"
							>
								Reset
							</button>
						)}
					</div>

					{/* Map */}
					{isMounted && (
						<PlotfolioMap
							provider="leaflet"
							viewMode={mapLayerType}
							properties={filteredProperties}
							selectedProperty={selectedProperty}
							onPropertyClick={handlePropertySelect}
							viewport={viewport}
							onViewportChange={handleViewportChange}
							showCustomBoundaries
							showGrid={false}
							showPropertyGrids
							showStateBorders
							onGridToggle={() => {}}
							onRegionHover={() => {}}
							onRegionClick={() => {}}
							isDrawingBoundary={false}
							isSelectingGrid={false}
							onBoundaryComplete={() => {}}
							onDrawingCancel={() => {}}
							onGridComplete={() => {}}
							onGridCancel={() => {}}
							useImageMarkers
							className="w-full h-full mt-2"
						/>
					)}

					{/* Search & locate */}
					<MapSearchControl
						onLocationSelect={handleSearchLocationSelect}
						onLocateMe={handleLocateMe}
						className="absolute top-3 right-3 z-layer-map"
					/>

					{/* Layer toggle */}
					<div className="absolute bottom-4 right-4 z-layer-map bg-glass backdrop-blur-md border border-border/50 rounded-md shadow-lg p-1 flex items-center gap-1">
						{(["standard", "satellite"] as const).map((layer) => (
							<button
								key={layer}
								onClick={() => setMapLayerType(layer)}
								className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
									mapLayerType === layer
										? "bg-blue-600 text-white"
										: "text-on-surface-variant hover:bg-surface-container"
								}`}
							>
								{layer === "standard" ? "Map" : "Satellite"}
							</button>
						))}
					</div>
				</div>
			</div>
		</AppShell>
	);
}
