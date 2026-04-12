"use client";

import { useRequireAuth } from "@/components/AuthContext";
import AppShell from "@/components/layout/AppShell";
import {
	queryKeys,
	useMyProperties,
	useProviderSettings,
} from "@/hooks/usePropertyQueries";
import { PropertyAPI } from "@/lib/api";
import { Property, SurveyData } from "@/types/property";
import { PROVIDER_DEFAULTS } from "@/types/providers";
import { useQueryClient } from "@tanstack/react-query";
import {
	ChevronDown,
	ChevronUp,
	Edit3,
	Layers,
	List,
	MapPin,
	Minus,
	Plus,
	Wind,
	X,
	Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import MapPropertySidebar from "@/components/maps/MapPropertySidebar";
import PropertyCompactView from "@/components/property/PropertyCompactView";

// Dynamically import unified map component to avoid SSR issues
const PlotfolioMap = dynamic(() => import("@/components/maps/PlotfolioMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-surface-container-highest animate-pulse flex items-center justify-center">
			<div className="text-on-surface-variant">Loading map...</div>
		</div>
	),
});

export default function Home() {
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null,
	);
	const { user } = useRequireAuth();
	const queryClient = useQueryClient();
	const {
		data: properties = [],
		isLoading: loading,
		error: queryError,
	} = useMyProperties(user?.id);
	const error = queryError ? "Failed to load properties" : null;
	const [searchQuery, setSearchQuery] = useState("");
	const [isBoundaryVisible, setIsBoundaryVisible] = useState(true);
	const [isGridVisible, setIsGridVisible] = useState(false);
	const [isPropertyGridVisible, setIsPropertyGridVisible] = useState(true);
	const [isStateBordersVisible, setIsStateBordersVisible] = useState(true);
	const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
	const [isSelectingGrid, setIsSelectingGrid] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isPropertyCardExpanded, setIsPropertyCardExpanded] = useState(true);
	const [isPropertyCardVisible, setIsPropertyCardVisible] = useState(true);
	const { data: providerSettings } = useProviderSettings();
	const [mapType, setMapType] = useState<"leaflet" | "mapbox" | "google">(
		PROVIDER_DEFAULTS.mapRenderer as "leaflet" | "mapbox" | "google",
	);
	const [mapLayerType, setMapLayerType] = useState<
		"standard" | "satellite" | "terrain" | "hybrid"
	>("standard");

	// Map Options Panel State
	const [showMapOptions, setShowMapOptions] = useState(false);
	const [showMobileSidebar, setShowMobileSidebar] = useState(false);
	const [mapViewMode, setMapViewMode] = useState<
		"automatic" | "satellite" | "street"
	>("automatic");
	const [climateRisk, setClimateRisk] = useState<
		"none" | "flood" | "fire" | "wind" | "air" | "heat"
	>("none");
	const [useImageMarkers, setUseImageMarkers] = useState(true);

	// State hover and selection
	const [hoveredState, setHoveredState] = useState<string | null>(null);
	const [selectedState, setSelectedState] = useState<string | null>(null);

	// Default viewport
	const [viewport, setViewport] = useState({
		center: [20, 0] as [number, number],
		zoom: 3,
		bounds: [
			[-60, -180],
			[80, 180],
		] as [[number, number], [number, number]],
	});

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

	// Sync mapType from saved provider settings whenever they change
	useEffect(() => {
		if (providerSettings?.mapRenderer) {
			setMapType(
				providerSettings.mapRenderer as "leaflet" | "mapbox" | "google",
			);
		}
	}, [providerSettings?.mapRenderer]);

	// Set mounted state and geolocate user
	useEffect(() => {
		setIsMounted(true);

		if (typeof navigator !== "undefined" && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setViewport((prev) => ({
						...prev,
						center: [position.coords.latitude, position.coords.longitude],
						zoom: 13,
					}));
				},
				(err) => {
					console.warn("Geolocation failed, using default view:", err.message);
				},
				{ enableHighAccuracy: true, timeout: 10000 },
			);
		}
	}, []);

	const filteredProperties = useMemo(() => {
		if (!searchQuery.trim()) return properties;
		const q = searchQuery.toLowerCase();
		return properties.filter(
			(property) =>
				property.name.toLowerCase().includes(q) ||
				property.address.toLowerCase().includes(q) ||
				property.owner.name.toLowerCase().includes(q),
		);
	}, [properties, searchQuery]);

	const handlePropertySelect = (property: Property) => {
		setSelectedProperty(property);
		setIsPropertyCardVisible(true);
		setIsPropertyCardExpanded(true);
		// Center map on the selected property
		setViewport({
			center: [property.coordinates.lat, property.coordinates.lng],
			zoom: 16, // Zoom in closer to see the property
			bounds: viewport.bounds,
		});
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	const handleSurveyUpload = async (
		propertyId: string,
		surveyData: SurveyData,
	) => {
		try {
			// Find the property and update it with survey data
			const updatedProperty = await PropertyAPI.updateProperty(propertyId, {
				surveyData: surveyData,
			});

			if (updatedProperty) {
				// Invalidate cache to refresh data
				queryClient.invalidateQueries({
					queryKey: queryKeys.properties.my(user?.id ?? ""),
				});

				// Update selected property if it's the one being updated
				if (selectedProperty?.id === propertyId) {
					setSelectedProperty(updatedProperty);
				}
			} else {
				console.error("❌ Failed to update property - no response");
			}
		} catch (error) {
			console.error("❌ Error uploading survey:", error);
		}
	};

	const handleBoundaryToggle = () => {
		setIsBoundaryVisible(!isBoundaryVisible);
	};

	const handleGridToggle = () => {
		setIsGridVisible(!isGridVisible);
	};

	const handlePropertyGridToggle = () => {
		setIsPropertyGridVisible(!isPropertyGridVisible);
	};

	const handleStateBordersToggle = () => {
		setIsStateBordersVisible(!isStateBordersVisible);
	};

	// Region bounds — dynamically built from property locations
	const regionBounds = useMemo(() => {
		const bounds: {
			[key: string]: { center: [number, number]; zoom: number };
		} = {};
		if (!properties) return bounds;
		const stateMap = new Map<string, { lats: number[]; lngs: number[] }>();
		for (const p of properties) {
			const state = p.state || "Other";
			if (!p.coordinates?.lat || !p.coordinates?.lng) continue;
			if (!stateMap.has(state)) stateMap.set(state, { lats: [], lngs: [] });
			stateMap.get(state)!.lats.push(p.coordinates.lat);
			stateMap.get(state)!.lngs.push(p.coordinates.lng);
		}
		for (const [state, coords] of stateMap) {
			const avgLat =
				coords.lats.reduce((a, b) => a + b, 0) / coords.lats.length;
			const avgLng =
				coords.lngs.reduce((a, b) => a + b, 0) / coords.lngs.length;
			bounds[state] = { center: [avgLat, avgLng], zoom: 12 };
		}
		return bounds;
	}, [properties]);

	const handleStateHover = (stateName: string | null) => {
		setHoveredState(stateName);
	};

	const handleStateClick = (stateName: string) => {
		setSelectedState(stateName);
		const stateInfo = regionBounds[stateName];
		if (stateInfo) {
			setViewport({
				center: stateInfo.center,
				zoom: stateInfo.zoom,
				bounds: viewport.bounds,
			});
		}
	};

	const handleMapViewModeChange = (
		mode: "automatic" | "satellite" | "street",
	) => {
		setMapViewMode(mode);
		// Map the view mode to our existing layer types
		switch (mode) {
			case "satellite":
				setMapLayerType("satellite");
				break;
			case "street":
				setMapLayerType("standard");
				break;
			default:
				setMapLayerType("standard");
				break;
		}
	};

	const handleGridSelection = async (grid: any) => {
		if (!selectedProperty) return;

		try {
			// Update property with grid data
			const updatedProperty = await PropertyAPI.updateProperty(
				selectedProperty.id,
				{ propertyGrid: grid },
			);

			if (updatedProperty) {
				// Invalidate cache to refresh data
				queryClient.invalidateQueries({
					queryKey: queryKeys.properties.my(user?.id ?? ""),
				});
				setSelectedProperty(updatedProperty);
			}
			setIsSelectingGrid(false);
		} catch (error) {
			console.error("Error saving property grid:", error);
		}
	};

	const handleDeleteGrid = async () => {
		if (!selectedProperty) return;

		const confirmDelete = window.confirm(
			"Are you sure you want to delete this property grid?",
		);
		if (!confirmDelete) return;

		try {
			// Remove grid by setting it to null
			const updatedProperty = await PropertyAPI.updateProperty(
				selectedProperty.id,
				{ propertyGrid: undefined },
			);

			if (updatedProperty) {
				// Invalidate cache to refresh data
				queryClient.invalidateQueries({
					queryKey: queryKeys.properties.my(user?.id ?? ""),
				});
				setSelectedProperty(updatedProperty);
			}
		} catch (error) {
			console.error("Error deleting property grid:", error);
		}
	};

	// Loading state
	if (loading) {
		return (
			<AppShell scrollable={false}>
				<div className="h-full flex items-center justify-center bg-surface-container-low">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
						<p className="text-on-surface-variant font-body">
							Loading properties...
						</p>
					</div>
				</div>
			</AppShell>
		);
	}

	// Error state
	if (error) {
		return (
			<AppShell scrollable={false}>
				<div className="h-full flex items-center justify-center bg-surface-container-low">
					<div className="text-center">
						<div className="text-error text-xl mb-4">⚠️ Error</div>
						<p className="text-on-surface-variant mb-4">{error}</p>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 signature-gradient text-white rounded-lg"
						>
							Retry
						</button>
					</div>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable={false}>
			<div className="flex flex-1 min-h-0 w-full relative">
				{/* Property List Sidebar — always visible on md+, slide-over on mobile */}
				<div className="hidden md:block shrink-0 w-80 h-full">
					<MapPropertySidebar
						properties={filteredProperties}
						selectedPropertyId={selectedProperty?.id ?? null}
						onPropertySelect={handlePropertySelect}
						searchQuery={searchQuery}
						onSearch={handleSearch}
					/>
				</div>
				{/* Mobile sidebar overlay */}
				{showMobileSidebar && (
					<div className="md:hidden absolute inset-0 z-1100 flex">
						<div className="w-80 max-w-[85vw] h-full bg-card shadow-xl">
							<MapPropertySidebar
								properties={filteredProperties}
								selectedPropertyId={selectedProperty?.id ?? null}
								onPropertySelect={(p) => {
									handlePropertySelect(p);
									setShowMobileSidebar(false);
								}}
								searchQuery={searchQuery}
								onSearch={handleSearch}
							/>
						</div>
						<div
							className="flex-1 bg-black/40"
							onClick={() => setShowMobileSidebar(false)}
						/>
					</div>
				)}
				{/* Full Screen Map */}
				<div className="flex-1 relative h-full">
					{/* Mobile property list toggle */}
					<button
						onClick={() => setShowMobileSidebar(true)}
						className="md:hidden absolute top-3 left-3 z-1000 bg-card shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-medium text-on-surface border border-border"
					>
						<List className="w-4 h-4" />
						Properties
					</button>
					{/* Map Component */}
					{isMounted && (
						<PlotfolioMap
							provider={mapType}
							viewMode={mapLayerType}
							properties={filteredProperties}
							selectedProperty={selectedProperty}
							onPropertyClick={handlePropertySelect}
							viewport={viewport}
							onViewportChange={handleViewportChange}
							showCustomBoundaries={isBoundaryVisible}
							showGrid={isGridVisible}
							showPropertyGrids={isPropertyGridVisible}
							showStateBorders={isStateBordersVisible}
							onGridToggle={handleGridToggle}
							onRegionHover={setHoveredState}
							onRegionClick={setSelectedState}
							isDrawingBoundary={isDrawingBoundary}
							isSelectingGrid={isSelectingGrid}
							onBoundaryComplete={(surveyData: SurveyData) => {
								handleSurveyUpload(selectedProperty!.id, surveyData);
								setIsDrawingBoundary(false);
							}}
							onDrawingCancel={() => setIsDrawingBoundary(false)}
							onGridComplete={handleGridSelection}
							onGridCancel={() => setIsSelectingGrid(false)}
							useImageMarkers={useImageMarkers}
							className="w-full h-full"
						/>
					)}

					{/* Hovered State Indicator */}
					{hoveredState && (
						<div className="absolute top-6 right-6 bg-glass backdrop-blur-md rounded-2xl shadow-xl p-3 z-1000">
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
								<span className="text-sm font-medium text-on-surface">
									{hoveredState}
								</span>
							</div>
						</div>
					)}

					{/* Climate Risk Overlay Indicator */}
					{climateRisk !== "none" && (
						<div
							className={`absolute ${
								hoveredState ? "top-20" : "top-6"
							} right-6 bg-glass backdrop-blur-md rounded-2xl shadow-xl p-4 z-1000`}
						>
							<div className="flex items-center space-x-3">
								<div className="flex items-center space-x-2">
									{climateRisk === "flood" && (
										<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
									)}
									{climateRisk === "fire" && (
										<div className="w-3 h-3 bg-red-500 rounded-full"></div>
									)}
									{climateRisk === "wind" && (
										<Wind className="w-4 h-4 text-on-surface-variant" />
									)}
									{climateRisk === "air" && (
										<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
									)}
									{climateRisk === "heat" && (
										<Zap className="w-4 h-4 text-orange-500" />
									)}
									<span className="text-sm font-medium text-on-surface capitalize">
										{climateRisk} Risk
									</span>
								</div>
								<button
									onClick={() => setClimateRisk("none")}
									className="text-outline hover:text-on-surface-variant"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
					)}

					{/* Map Options Panel */}
					{showMapOptions && (
						<div className="absolute top-6 left-4 right-4 sm:right-auto bg-glass backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-4 sm:w-64 z-1000">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-on-surface">
									Map Options
								</h3>
								<button
									onClick={() => setShowMapOptions(false)}
									className="text-outline hover:text-on-surface-variant"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Map View Mode */}
							<div className="mb-4">
								<div className="space-y-2">
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="mapView"
											checked={mapViewMode === "automatic"}
											onChange={() => handleMapViewModeChange("automatic")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">Automatic</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="mapView"
											checked={mapViewMode === "satellite"}
											onChange={() => handleMapViewModeChange("satellite")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">Satellite</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="mapView"
											checked={mapViewMode === "street"}
											onChange={() => handleMapViewModeChange("street")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">Street view</span>
									</label>
								</div>
							</div>

							{/* Layer Controls */}
							<div className="mb-4">
								<h4 className="text-sm font-medium text-on-surface mb-2">
									Map Layers
								</h4>
								<div className="space-y-2">
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={useImageMarkers}
											onChange={() => setUseImageMarkers(!useImageMarkers)}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">
											Image Markers
										</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={isStateBordersVisible}
											onChange={handleStateBordersToggle}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">
											State Borders
										</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={isBoundaryVisible}
											onChange={handleBoundaryToggle}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">
											Property Boundaries
										</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={isPropertyGridVisible}
											onChange={handlePropertyGridToggle}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-sm">
											Property Grids
										</span>
									</label>
								</div>
							</div>

							{/* Climate Risks */}
							<div>
								<h4 className="text-sm font-medium text-on-surface mb-2">
									Climate Risks
								</h4>
								<div className="grid grid-cols-2 gap-2">
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "none"}
											onChange={() => setClimateRisk("none")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">
											None selected
										</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "wind"}
											onChange={() => setClimateRisk("wind")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">Wind</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "flood"}
											onChange={() => setClimateRisk("flood")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">Flood</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "air"}
											onChange={() => setClimateRisk("air")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">Air</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "fire"}
											onChange={() => setClimateRisk("fire")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">Fire</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="radio"
											name="climateRisk"
											checked={climateRisk === "heat"}
											onChange={() => setClimateRisk("heat")}
											className="w-3 h-3 text-blue-600"
										/>
										<span className="text-on-surface text-xs">Heat</span>
									</label>
								</div>
							</div>
						</div>
					)}

					{/* Map Controls at Bottom */}
					<div className="absolute bottom-18 md:bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 sm:space-x-3 z-1000">
						{/* Map Options Toggle */}
						<button
							onClick={() => setShowMapOptions(!showMapOptions)}
							className={`bg-glass backdrop-blur-sm rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center space-x-2 text-sm ${
								showMapOptions ? "bg-blue-600 text-white" : "text-on-surface"
							}`}
						>
							<Layers className="w-4 h-4" />
							<span className="font-medium">Map</span>
							<ChevronDown className="w-3 h-3" />
						</button>

						{/* Zoom Controls */}
						<div className="bg-glass backdrop-blur-sm rounded-full shadow-md flex">
							<button
								onClick={() =>
									setViewport((prev) => ({
										...prev,
										zoom: Math.min(prev.zoom + 1, 20),
									}))
								}
								className="p-2 hover:bg-surface-container-high rounded-l-full transition-colors"
							>
								<Plus className="w-4 h-4 text-on-surface" />
							</button>
							<div className="w-px bg-surface-container-highest"></div>
							<button
								onClick={() =>
									setViewport((prev) => ({
										...prev,
										zoom: Math.max(prev.zoom - 1, 1),
									}))
								}
								className="p-2 hover:bg-surface-container-high rounded-r-full transition-colors"
							>
								<Minus className="w-4 h-4 text-on-surface" />
							</button>
						</div>

						{/* Map Edit Functions */}
						<div className="bg-glass backdrop-blur-sm rounded-full shadow-md flex">
							<button
								onClick={() => setIsDrawingBoundary(!isDrawingBoundary)}
								className={`p-2 hover:bg-surface-container-high transition-colors ${
									isDrawingBoundary
										? "bg-blue-100 text-blue-600"
										: "text-on-surface"
								}`}
								title="Draw Boundary"
							>
								<Edit3 className="w-4 h-4" />
							</button>
							<div className="w-px bg-surface-container-highest"></div>
							<button
								onClick={() => setIsSelectingGrid(!isSelectingGrid)}
								className={`p-2 hover:bg-surface-container-high transition-colors ${
									isSelectingGrid
										? "bg-blue-100 text-blue-600"
										: "text-on-surface"
								}`}
								title="Select Grid"
							>
								<MapPin className="w-4 h-4" />
							</button>
							<div className="w-px bg-surface-container-highest"></div>
							<button
								onClick={handleBoundaryToggle}
								className={`p-2 hover:bg-surface-container-high rounded-r-full transition-colors ${
									isBoundaryVisible
										? "bg-blue-100 text-blue-600"
										: "text-on-surface"
								}`}
								title="Toggle Boundaries"
							>
								<Layers className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Property Details Overlay */}
					{selectedProperty && isPropertyCardVisible && (
						<div className="absolute top-2 left-2 right-2 sm:right-auto sm:w-80 max-h-[calc(100%-1rem)] bg-glass backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 z-999 transition-all duration-300 flex flex-col">
							{/* Header with Controls */}
							<div className="flex items-center justify-between p-4 pb-0 shrink-0">
								<h2 className="text-lg font-semibold text-on-surface truncate flex-1 mr-3">
									{selectedProperty.name}
								</h2>
								<div className="flex items-center space-x-1">
									<button
										onClick={() =>
											setIsPropertyCardExpanded(!isPropertyCardExpanded)
										}
										className="w-6 h-6 bg-surface-container-high hover:bg-surface-container-highest rounded flex items-center justify-center transition-colors"
									>
										{isPropertyCardExpanded ? (
											<ChevronUp className="w-3 h-3 text-on-surface-variant" />
										) : (
											<ChevronDown className="w-3 h-3 text-on-surface-variant" />
										)}
									</button>
									<button
										onClick={() => setIsPropertyCardVisible(false)}
										className="w-6 h-6 bg-surface-container-high hover:bg-surface-container-highest rounded flex items-center justify-center transition-colors"
									>
										<X className="w-3 h-3 text-on-surface-variant" />
									</button>
								</div>
							</div>

							{/* Collapsed State - Only show basic info */}
							{!isPropertyCardExpanded && (
								<div className="px-4 pb-4">
									<p className="text-on-surface-variant text-sm">
										{selectedProperty.address}
									</p>
									<div className="flex items-center justify-between mt-3">
										<span className="text-xs text-outline">
											{selectedProperty.area.toLocaleString()} m²
										</span>
										<span className="text-xs font-medium text-green-600">
											{selectedProperty.currentValue &&
												`$${selectedProperty.currentValue.toLocaleString()}`}
										</span>
									</div>
								</div>
							)}

							{/* Expanded State - PropertyCompactView */}
							{isPropertyCardExpanded && (
								<div className="overflow-y-auto p-4 pt-2">
									<PropertyCompactView
										property={selectedProperty}
										layout="compact"
										showGallery={false}
										showOwner={false}
										isOwner
									/>
								</div>
							)}
						</div>
					)}

					{/* Minimized Property Indicator */}
					{selectedProperty && !isPropertyCardVisible && (
						<div className="absolute top-6 left-2 z-999">
							<button
								onClick={() => setIsPropertyCardVisible(true)}
								className="bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-black/90 transition-colors flex items-center space-x-1"
							>
								<span>{selectedProperty.name}</span>
								<ChevronUp className="w-3 h-3" />
							</button>
						</div>
					)}
				</div>
			</div>
		</AppShell>
	);
}
