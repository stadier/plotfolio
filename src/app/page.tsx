"use client";

import { PropertyAPI } from "@/lib/api";
import { Property, SurveyData } from "@/types/property";
import {
	Building2,
	Calendar,
	ChevronDown,
	ChevronUp,
	Edit3,
	Eye,
	Heart,
	Home as HomeIcon,
	Layers,
	MapPin,
	Minus,
	Plus,
	Search,
	Settings,
	Thermometer,
	User,
	Wind,
	X,
	Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// Dynamically import unified map component to avoid SSR issues
const PlotfolioMap = dynamic(() => import("@/components/maps/PlotfolioMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
			<div className="text-gray-600">Loading map...</div>
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
	const [isStateBordersVisible, setIsStateBordersVisible] = useState(true);
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
	const [isSelectingGrid, setIsSelectingGrid] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isPropertyCardExpanded, setIsPropertyCardExpanded] = useState(true);
	const [isPropertyCardVisible, setIsPropertyCardVisible] = useState(true);
	const [mapType, setMapType] = useState<"leaflet" | "mapbox" | "google">(
		"google"
	);
	const [mapLayerType, setMapLayerType] = useState<
		"standard" | "satellite" | "terrain" | "hybrid"
	>("standard");

	// Map Options Panel State
	const [showMapOptions, setShowMapOptions] = useState(false);
	const [mapViewMode, setMapViewMode] = useState<
		"automatic" | "satellite" | "street"
	>("automatic");
	const [climateRisk, setClimateRisk] = useState<
		"none" | "flood" | "fire" | "wind" | "air" | "heat"
	>("none");

	// State hover and selection
	const [hoveredState, setHoveredState] = useState<string | null>(null);
	const [selectedState, setSelectedState] = useState<string | null>(null);

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
			console.log("🔄 Uploading survey data to database...");
			console.log("Property ID:", propertyId);
			console.log("Survey data:", surveyData);

			// Find the property and update it with survey data
			const updatedProperty = await PropertyAPI.updateProperty(propertyId, {
				surveyData: surveyData,
			});

			if (updatedProperty) {
				console.log("✅ Property updated successfully:", updatedProperty);

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

				console.log("✅ Boundary saved to property!");
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

	// State bounds for Nigeria's states (approximate)
	const stateBounds: {
		[key: string]: { center: [number, number]; zoom: number };
	} = {
		Lagos: { center: [6.5244, 3.3792], zoom: 10 },
		"Abuja FCT": { center: [9.0765, 7.4951], zoom: 11 },
		Rivers: { center: [4.8156, 6.9778], zoom: 9 },
		Kano: { center: [12.0022, 8.592], zoom: 9 },
		Kaduna: { center: [10.6086, 7.4165], zoom: 9 },
		Oyo: { center: [8.1555, 3.947], zoom: 9 },
		Niger: { center: [9.6137, 6.5569], zoom: 8 },
		Kwara: { center: [8.9669, 4.581], zoom: 9 },
		Ogun: { center: [7.1608, 3.3476], zoom: 10 },
		Anambra: { center: [6.2209, 6.9937], zoom: 10 },
		Enugu: { center: [6.5244, 7.5102], zoom: 10 },
		Imo: { center: [5.4873, 7.0261], zoom: 10 },
		Abia: { center: [5.4527, 7.5248], zoom: 10 },
		"Cross River": { center: [6.0445, 8.6753], zoom: 9 },
		"Akwa Ibom": { center: [4.9056, 7.8564], zoom: 9 },
		Delta: { center: [5.6804, 6.0366], zoom: 9 },
		Edo: { center: [6.335, 5.6037], zoom: 9 },
		Bayelsa: { center: [4.7719, 6.0699], zoom: 10 },
		Plateau: { center: [9.2182, 9.5179], zoom: 9 },
		Benue: { center: [7.3298, 8.7362], zoom: 9 },
	};

	const handleStateHover = (stateName: string | null) => {
		setHoveredState(stateName);
	};

	const handleStateClick = (stateName: string) => {
		setSelectedState(stateName);
		const stateInfo = stateBounds[stateName];
		if (stateInfo) {
			setViewport({
				center: stateInfo.center,
				zoom: stateInfo.zoom,
				bounds: viewport.bounds,
			});
		}
	};

	const handleMapViewModeChange = (
		mode: "automatic" | "satellite" | "street"
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

	const handleDeleteGrid = async () => {
		if (!selectedProperty) return;

		const confirmDelete = window.confirm(
			"Are you sure you want to delete this property grid?"
		);
		if (!confirmDelete) return;

		try {
			// Remove grid by setting it to null
			const updatedProperty = await PropertyAPI.updateProperty(
				selectedProperty.id,
				{ propertyGrid: undefined }
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
		} catch (error) {
			console.error("Error deleting property grid:", error);
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
		<div className="h-screen flex overflow-hidden">
			{/* Left Navigation Sidebar */}
			<div className="w-16 bg-white shadow-sm flex flex-col items-center py-4 space-y-3 z-20">
				<div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center">
					<Building2 className="w-4 h-4 text-white" />
				</div>
				<div className="flex flex-col space-y-2">
					<button className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
						<HomeIcon className="w-4 h-4 text-white" />
					</button>
					<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
						<Search className="w-4 h-4 text-gray-600" />
					</button>
					<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
						<Heart className="w-4 h-4 text-gray-600" />
					</button>
					<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
						<User className="w-4 h-4 text-gray-600" />
					</button>
					<button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
						<Settings className="w-4 h-4 text-gray-600" />
					</button>
				</div>
			</div>

			{/* Full Screen Map */}
			<div className="flex-1 relative">
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
						className="w-full h-full"
					/>
				)}

				{/* Hovered State Indicator */}
				{hoveredState && (
					<div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3 z-20">
						<div className="flex items-center space-x-2">
							<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
							<span className="text-sm font-medium text-gray-900">
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
						} right-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 z-20`}
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
									<Wind className="w-4 h-4 text-gray-600" />
								)}
								{climateRisk === "air" && (
									<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
								)}
								{climateRisk === "heat" && (
									<Zap className="w-4 h-4 text-orange-500" />
								)}
								<span className="text-sm font-medium text-gray-900 capitalize">
									{climateRisk} Risk
								</span>
							</div>
							<button
								onClick={() => setClimateRisk("none")}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* Map Options Panel */}
				{showMapOptions && (
					<div className="absolute top-6 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 p-4 w-64 z-20">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-semibold text-gray-900">
								Map Options
							</h3>
							<button
								onClick={() => setShowMapOptions(false)}
								className="text-gray-400 hover:text-gray-600"
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
									<span className="text-gray-900 text-sm">Automatic</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="mapView"
										checked={mapViewMode === "satellite"}
										onChange={() => handleMapViewModeChange("satellite")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-sm">Satellite</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="mapView"
										checked={mapViewMode === "street"}
										onChange={() => handleMapViewModeChange("street")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-sm">Street view</span>
								</label>
							</div>
						</div>

						{/* Layer Controls */}
						<div className="mb-4">
							<h4 className="text-sm font-medium text-gray-900 mb-2">
								Map Layers
							</h4>
							<div className="space-y-2">
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="checkbox"
										checked={isStateBordersVisible}
										onChange={handleStateBordersToggle}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-sm">State Borders</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="checkbox"
										checked={isBoundaryVisible}
										onChange={handleBoundaryToggle}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-sm">
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
									<span className="text-gray-900 text-sm">Property Grids</span>
								</label>
							</div>
						</div>

						{/* Climate Risks */}
						<div>
							<h4 className="text-sm font-medium text-gray-900 mb-2">
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
									<span className="text-gray-900 text-xs">None selected</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="climateRisk"
										checked={climateRisk === "wind"}
										onChange={() => setClimateRisk("wind")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-xs">Wind</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="climateRisk"
										checked={climateRisk === "flood"}
										onChange={() => setClimateRisk("flood")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-xs">Flood</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="climateRisk"
										checked={climateRisk === "air"}
										onChange={() => setClimateRisk("air")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-xs">Air</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="climateRisk"
										checked={climateRisk === "fire"}
										onChange={() => setClimateRisk("fire")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-xs">Fire</span>
								</label>
								<label className="flex items-center space-x-2 cursor-pointer">
									<input
										type="radio"
										name="climateRisk"
										checked={climateRisk === "heat"}
										onChange={() => setClimateRisk("heat")}
										className="w-3 h-3 text-blue-600"
									/>
									<span className="text-gray-900 text-xs">Heat</span>
								</label>
							</div>
						</div>
					</div>
				)}

				{/* Map Controls at Bottom */}
				<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 z-20">
					{/* Map Options Toggle */}
					<button
						onClick={() => setShowMapOptions(!showMapOptions)}
						className={`bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center space-x-2 text-sm ${
							showMapOptions ? "bg-blue-600 text-white" : "text-gray-900"
						}`}
					>
						<Layers className="w-4 h-4" />
						<span className="font-medium">Map</span>
						<ChevronDown className="w-3 h-3" />
					</button>

					{/* Zoom Controls */}
					<div className="bg-white/95 backdrop-blur-sm rounded-full shadow-md flex">
						<button
							onClick={() =>
								setViewport((prev) => ({
									...prev,
									zoom: Math.min(prev.zoom + 1, 20),
								}))
							}
							className="p-2 hover:bg-gray-100 rounded-l-full transition-colors"
						>
							<Plus className="w-4 h-4 text-gray-900" />
						</button>
						<div className="w-px bg-gray-200"></div>
						<button
							onClick={() =>
								setViewport((prev) => ({
									...prev,
									zoom: Math.max(prev.zoom - 1, 1),
								}))
							}
							className="p-2 hover:bg-gray-100 rounded-r-full transition-colors"
						>
							<Minus className="w-4 h-4 text-gray-900" />
						</button>
					</div>

					{/* Map Edit Functions */}
					<div className="bg-white/95 backdrop-blur-sm rounded-full shadow-md flex">
						<button
							onClick={() => setIsDrawingBoundary(!isDrawingBoundary)}
							className={`p-2 hover:bg-gray-100 transition-colors ${
								isDrawingBoundary
									? "bg-blue-100 text-blue-600"
									: "text-gray-900"
							}`}
							title="Draw Boundary"
						>
							<Edit3 className="w-4 h-4" />
						</button>
						<div className="w-px bg-gray-200"></div>
						<button
							onClick={() => setIsSelectingGrid(!isSelectingGrid)}
							className={`p-2 hover:bg-gray-100 transition-colors ${
								isSelectingGrid ? "bg-blue-100 text-blue-600" : "text-gray-900"
							}`}
							title="Select Grid"
						>
							<MapPin className="w-4 h-4" />
						</button>
						<div className="w-px bg-gray-200"></div>
						<button
							onClick={handleBoundaryToggle}
							className={`p-2 hover:bg-gray-100 rounded-r-full transition-colors ${
								isBoundaryVisible
									? "bg-blue-100 text-blue-600"
									: "text-gray-900"
							}`}
							title="Toggle Boundaries"
						>
							<Layers className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Property Details Overlay */}
				{selectedProperty && isPropertyCardVisible && (
					<div className="absolute top-2 left-2 w-80 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 z-10 transition-all duration-300">
						{/* Header with Controls */}
						<div className="flex items-center justify-between p-4 pb-0">
							<h2 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-3">
								{selectedProperty.name}
							</h2>
							<div className="flex items-center space-x-1">
								<button
									onClick={() =>
										setIsPropertyCardExpanded(!isPropertyCardExpanded)
									}
									className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
								>
									{isPropertyCardExpanded ? (
										<ChevronUp className="w-3 h-3 text-gray-600" />
									) : (
										<ChevronDown className="w-3 h-3 text-gray-600" />
									)}
								</button>
								<button
									onClick={() => setIsPropertyCardVisible(false)}
									className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
								>
									<X className="w-3 h-3 text-gray-600" />
								</button>
							</div>
						</div>

						{/* Collapsed State - Only show basic info */}
						{!isPropertyCardExpanded && (
							<div className="px-4 pb-4">
								<p className="text-gray-600 text-sm">
									{selectedProperty.address}
								</p>
								<div className="flex items-center justify-between mt-3">
									<span className="text-xs text-gray-500">
										{selectedProperty.area.toLocaleString()} m²
									</span>
									<span className="text-xs font-medium text-green-600">
										{selectedProperty.currentValue &&
											`₦${selectedProperty.currentValue.toLocaleString()}`}
									</span>
								</div>
							</div>
						)}

						{/* Expanded State - Full content */}
						{isPropertyCardExpanded && (
							<div className="p-4 pt-0">
								{/* Property Image */}
								<div className="relative mb-4 mt-3">
									<img
										src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
										alt="Property"
										className="w-full h-32 rounded-xl object-cover"
									/>
									<button className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center">
										<Heart className="w-3 h-3 text-gray-600" />
									</button>
								</div>

								{/* Property Info */}
								<div className="mb-4">
									<p className="text-gray-600 text-sm mb-3">
										{selectedProperty.address}
									</p>
								</div>

								{/* Property Stats */}
								<div className="grid grid-cols-3 gap-3 mb-4">
									<div className="text-center">
										<div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mb-1 mx-auto">
											<Calendar className="w-4 h-4 text-gray-600" />
										</div>
										<div className="text-xs text-gray-500">Building Age</div>
										<div className="text-sm font-bold text-gray-900">12Y</div>
									</div>
									<div className="text-center">
										<div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mb-1 mx-auto">
											<Eye className="w-4 h-4 text-gray-600" />
										</div>
										<div className="text-xs text-gray-500">Daily Visitors</div>
										<div className="text-sm font-bold text-gray-900">7,980</div>
									</div>
									<div className="text-center">
										<div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mb-1 mx-auto">
											<Thermometer className="w-4 h-4 text-gray-600" />
										</div>
										<div className="text-xs text-gray-500">Temperature</div>
										<div className="text-sm font-bold text-gray-900">34°F</div>
									</div>
								</div>

								{/* Tenants Section */}
								<div className="mb-4">
									<h3 className="text-sm font-semibold text-gray-900 mb-2">
										Tenants
									</h3>
									<p className="text-xs text-gray-600 mb-3">
										Join over 800 active tenants benefiting from being part of
										our community.
									</p>

									{/* Tenant Count */}
									<div className="flex items-center mb-3">
										<span className="text-2xl font-bold text-gray-900">
											650+
										</span>
										<span className="text-gray-500 ml-1 text-xs">members</span>
									</div>

									{/* Avatar Stack */}
									<div className="flex -space-x-2 mb-3">
										{[1, 2, 3, 4, 5, 6].map((i) => (
											<div
												key={i}
												className="w-6 h-6 rounded-full bg-blue-500 border border-white"
											></div>
										))}
									</div>
								</div>

								{/* Request Button */}
								<button className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
									Request
								</button>
							</div>
						)}
					</div>
				)}

				{/* Minimized Property Indicator */}
				{selectedProperty && !isPropertyCardVisible && (
					<div className="absolute top-6 left-2 z-10">
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
	);
}
