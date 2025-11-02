"use client";

import Header from "@/components/layout/Header";
import PropertySidebar from "@/components/layout/PropertySidebar";
import MapboxViewSwitcher from "@/components/maps/MapboxViewSwitcher";
import MapViewSwitcher from "@/components/maps/MapViewSwitcher";
import { PropertyAPI } from "@/lib/api";
import { Property, SurveyData } from "@/types/property";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// Dynamically import map components to avoid SSR issues
const PropertyMap = dynamic(() => import("@/components/maps/PropertyMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
			<div className="text-gray-600">Loading map...</div>
		</div>
	),
});

// Mapbox - requires webpack mode (npm run dev:webpack)
const MapboxMap = dynamic(() => import("@/components/maps/MapboxMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
			<div className="text-gray-600">Loading Mapbox...</div>
		</div>
	),
});

export default function Home() {
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
	const [isBoundaryVisible, setIsBoundaryVisible] = useState(true);
	const [isGridVisible, setIsGridVisible] = useState(false);
	const [isPropertyGridVisible, setIsPropertyGridVisible] = useState(true);
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
	const [isSelectingGrid, setIsSelectingGrid] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [mapType, setMapType] = useState<"leaflet" | "mapbox">("leaflet");
	const [mapLayerType, setMapLayerType] = useState<
		"standard" | "satellite" | "terrain" | "hybrid"
	>("standard");
	const [mapboxStyleType, setMapboxStyleType] = useState<
		"streets" | "satellite" | "outdoors" | "satellite-streets"
	>("streets");

	// Default viewport for Abuja, Nigeria
	const [viewport, setViewport] = useState({
		center: [9.0765, 7.4951] as [number, number],
		zoom: 12,
		bounds: [
			[8.9, 7.3],
			[9.2, 7.7],
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
		[]
	);

	// Set mounted state
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Load properties from API on component mount
	useEffect(() => {
		const loadProperties = async () => {
			try {
				setLoading(true);
				setError(null);

				// First try to get properties from the database
				let propertyData = await PropertyAPI.getAllProperties();

				// If no properties exist, seed the database
				if (propertyData.length === 0) {
					console.log("No properties found, seeding database...");
					const seeded = await PropertyAPI.seedDatabase();
					if (seeded) {
						propertyData = await PropertyAPI.getAllProperties();
					} else {
						throw new Error("Failed to seed database");
					}
				}

				console.log("✅ Loaded properties:", propertyData.length, "properties");
				setProperties(propertyData);
				setFilteredProperties(propertyData);
			} catch (err) {
				console.error("Error loading properties:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load properties"
				);
			} finally {
				setLoading(false);
			}
		};

		loadProperties();
	}, []);

	const handlePropertySelect = (property: Property) => {
		setSelectedProperty(property);
		// Center map on the selected property
		setViewport({
			center: [property.coordinates.lat, property.coordinates.lng],
			zoom: 16, // Zoom in closer to see the property
			bounds: viewport.bounds,
		});
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		if (!query.trim()) {
			setFilteredProperties(properties);
		} else {
			const filtered = properties.filter(
				(property) =>
					property.name.toLowerCase().includes(query.toLowerCase()) ||
					property.address.toLowerCase().includes(query.toLowerCase()) ||
					property.owner.name.toLowerCase().includes(query.toLowerCase())
			);
			setFilteredProperties(filtered);
		}
	};

	const handleSurveyUpload = async (
		propertyId: string,
		surveyData: SurveyData
	) => {
		try {
			// Find the property and update it with survey data
			const updatedProperty = await PropertyAPI.updateProperty(propertyId, {
				surveyData: surveyData,
			});

			if (updatedProperty) {
				// Update local state
				setProperties((prev) =>
					prev.map((p) => (p.id === propertyId ? updatedProperty : p))
				);
				setFilteredProperties((prev) =>
					prev.map((p) => (p.id === propertyId ? updatedProperty : p))
				);

				// Update selected property if it's the one being updated
				if (selectedProperty?.id === propertyId) {
					setSelectedProperty(updatedProperty);
				}
			}
		} catch (error) {
			console.error("Error uploading survey:", error);
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

	const handleGridSelection = async (grid: any) => {
		if (!selectedProperty) return;

		try {
			// Update property with grid data
			const updatedProperty = await PropertyAPI.updateProperty(
				selectedProperty.id,
				{ propertyGrid: grid }
			);

			if (updatedProperty) {
				// Update local state
				setProperties((prev) =>
					prev.map((p) => (p.id === selectedProperty.id ? updatedProperty : p))
				);
				setFilteredProperties((prev) =>
					prev.map((p) => (p.id === selectedProperty.id ? updatedProperty : p))
				);
				setSelectedProperty(updatedProperty);
			}
			setIsSelectingGrid(false);
		} catch (error) {
			console.error("Error saving property grid:", error);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading properties...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="text-red-600 text-xl mb-4">⚠️ Error</div>
					<p className="text-gray-600 mb-4">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Header />
			<div className="flex">
				<PropertySidebar
					properties={filteredProperties}
					selectedProperty={selectedProperty}
					onPropertySelect={handlePropertySelect}
					searchQuery={searchQuery}
					onSearch={handleSearch}
				/>
				<main className="flex-1 ml-80 p-6">
					{/* Map Panel - Full Width */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-7rem)]">
						<div className="p-4 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-gray-900">
									Property Map - Abuja FCT
								</h2>
								<div className="flex gap-2 items-center">
									{/* Map Type Toggle */}
									<div className="flex rounded-lg border border-gray-300 overflow-hidden">
										<button
											onClick={() => setMapType("leaflet")}
											className={`px-3 py-2 text-sm transition-colors ${
												mapType === "leaflet"
													? "bg-purple-100 text-purple-700 font-medium"
													: "bg-white text-gray-700 hover:bg-gray-50"
											}`}
										>
											🗺️ Leaflet
										</button>
										<button
											onClick={() => setMapType("mapbox")}
											className={`px-3 py-2 text-sm transition-colors border-l border-gray-300 ${
												mapType === "mapbox"
													? "bg-purple-100 text-purple-700 font-medium"
													: "bg-white text-gray-700 hover:bg-gray-50"
											}`}
										>
											🚀 Mapbox
										</button>
									</div>

									{selectedProperty &&
										!isDrawingBoundary &&
										!isSelectingGrid &&
										mapType === "leaflet" && (
											<>
												<button
													onClick={() => setIsDrawingBoundary(true)}
													className="px-3 py-2 text-sm rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
												>
													✏️ Draw Boundary
												</button>
												<button
													onClick={() => setIsSelectingGrid(true)}
													className="px-3 py-2 text-sm rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
												>
													⊞ Select Grid
												</button>
											</>
										)}
									<button
										onClick={handleBoundaryToggle}
										className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
											isBoundaryVisible
												? "bg-blue-100 border-blue-300 text-blue-700"
												: "bg-gray-100 border-gray-300 text-gray-700"
										}`}
									>
										{isBoundaryVisible ? "Hide" : "Show"} Boundaries
									</button>
									<button
										onClick={handlePropertyGridToggle}
										className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
											isPropertyGridVisible
												? "bg-purple-100 border-purple-300 text-purple-700"
												: "bg-gray-100 border-gray-300 text-gray-700"
										}`}
									>
										{isPropertyGridVisible ? "Hide" : "Show"} Property Grids
									</button>
								</div>
							</div>
						</div>
						<div className="relative" style={{ height: "calc(100% - 5rem)" }}>
							{/* Map View Switcher - Only for Leaflet */}
							{isMounted && mapType === "leaflet" && (
								<div
									className="absolute top-4 right-4"
									style={{ zIndex: 1000 }}
								>
									<MapViewSwitcher
										currentView={mapLayerType}
										onViewChange={setMapLayerType}
									/>
								</div>
							)}
							{isMounted && mapType === "leaflet" && (
								<PropertyMap
									properties={filteredProperties}
									selectedProperty={selectedProperty}
									onPropertyClick={handlePropertySelect}
									viewport={viewport}
									onViewportChange={handleViewportChange}
									showCustomBoundaries={isBoundaryVisible}
									showGrid={isGridVisible}
									showPropertyGrids={isPropertyGridVisible}
									onGridToggle={handleGridToggle}
									isDrawingBoundary={isDrawingBoundary}
									isSelectingGrid={isSelectingGrid}
									onBoundaryComplete={(surveyData) => {
										handleSurveyUpload(selectedProperty!.id, surveyData);
										setIsDrawingBoundary(false);
									}}
									onDrawingCancel={() => setIsDrawingBoundary(false)}
									onGridComplete={handleGridSelection}
									onGridCancel={() => setIsSelectingGrid(false)}
									layerType={mapLayerType}
								/>
							)}
							{/* Mapbox View Switcher */}
							{isMounted && mapType === "mapbox" && (
								<div
									className="absolute top-4 right-4"
									style={{ zIndex: 1000 }}
								>
									<MapboxViewSwitcher
										currentView={mapboxStyleType}
										onViewChange={setMapboxStyleType}
									/>
								</div>
							)}{" "}
							{isMounted && mapType === "mapbox" && (
								<MapboxMap
									properties={filteredProperties}
									selectedProperty={selectedProperty}
									onPropertyClick={handlePropertySelect}
									viewport={viewport}
									onViewportChange={handleViewportChange}
									showCustomBoundaries={isBoundaryVisible}
									isDrawingBoundary={isDrawingBoundary}
									onBoundaryComplete={(surveyData) => {
										handleSurveyUpload(selectedProperty!.id, surveyData);
										setIsDrawingBoundary(false);
									}}
									onDrawingCancel={() => setIsDrawingBoundary(false)}
									mapStyle={mapboxStyleType}
								/>
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
