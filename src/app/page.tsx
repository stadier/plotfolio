"use client";

import Header from "@/components/layout/Header";
import PropertySidebar from "@/components/layout/PropertySidebar";
import PropertyDetailCard from "@/components/property/PropertyDetailCard";
import PropertyTrackingCard from "@/components/property/PropertyTrackingCard";
import { PropertyAPI } from "@/lib/api";
import { Property, PropertyStatus, SurveyData } from "@/types/property";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import custom plot boundary component
const CustomPlotBoundary = dynamic(
	() => import("@/components/maps/CustomPlotBoundary"),
	{
		ssr: false,
	}
);

// Dynamically import manual boundary drawer
const ManualBoundaryDrawer = dynamic(
	() => import("@/components/maps/ManualBoundaryDrawer"),
	{
		ssr: false,
	}
);

// Dynamically import map component to avoid SSR issues
const PropertyMap = dynamic(() => import("@/components/maps/PropertyMap"), {
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
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);

	// Default viewport for Abuja, Nigeria
	const [viewport, setViewport] = useState({
		center: [9.0765, 7.4951] as [number, number],
		zoom: 12,
		bounds: [
			[8.9, 7.3],
			[9.2, 7.7],
		] as [[number, number], [number, number]],
	});

	const handleViewportChange = (newViewport: {
		center: [number, number];
		zoom: number;
		bounds?: [[number, number], [number, number]];
	}) => {
		setViewport((prev) => ({ ...prev, ...newViewport }));
	};

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
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
						{/* Property Details Panel */}
						<div className="space-y-6">
							{selectedProperty ? (
								<>
									<PropertyDetailCard
										property={selectedProperty}
										onSurveyUpdate={(surveyData) =>
											handleSurveyUpload(selectedProperty.id, surveyData)
										}
									/>
									<PropertyTrackingCard property={selectedProperty} />
								</>
							) : (
								<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
									<div className="text-gray-400 text-6xl mb-4">🏗️</div>
									<h2 className="text-xl font-semibold text-gray-900 mb-2">
										Welcome to Plotfolio
									</h2>
									<p className="text-gray-600 mb-6">
										Select a property from the sidebar to view details, manage
										documents, and track development progress.
									</p>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div className="bg-blue-50 p-4 rounded-lg">
											<div className="text-blue-600 font-semibold mb-1">
												{properties.length}
											</div>
											<div className="text-blue-700">Total Properties</div>
										</div>
										<div className="bg-green-50 p-4 rounded-lg">
											<div className="text-green-600 font-semibold mb-1">
												{
													properties.filter(
														(p) => p.status === PropertyStatus.OWNED
													).length
												}
											</div>
											<div className="text-green-700">Owned Properties</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Map Panel */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
							<div className="p-4 border-b border-gray-200">
								<div className="flex items-center justify-between">
									<h2 className="text-lg font-semibold text-gray-900">
										Property Map - Abuja FCT
									</h2>
									<div className="flex gap-2">
										{selectedProperty && !isDrawingBoundary && (
											<button
												onClick={() => setIsDrawingBoundary(true)}
												className="px-3 py-2 text-sm rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
											>
												✏️ Draw Boundary
											</button>
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
									</div>
								</div>
							</div>
							<div className="h-96 lg:h-[calc(100vh-12rem)] relative">
								<PropertyMap
									properties={filteredProperties}
									selectedProperty={selectedProperty}
									onPropertyClick={handlePropertySelect}
									viewport={viewport}
									onViewportChange={handleViewportChange}
								/>
								{isBoundaryVisible && selectedProperty?.surveyData && (
									<CustomPlotBoundary
										surveyData={[selectedProperty.surveyData]}
										selectedPlotId={selectedProperty.id}
									/>
								)}
								{isDrawingBoundary && selectedProperty && (
									<ManualBoundaryDrawer
										propertyId={selectedProperty.id}
										existingBoundary={selectedProperty.surveyData}
										onBoundaryComplete={(surveyData) => {
											handleSurveyUpload(selectedProperty.id, surveyData);
											setIsDrawingBoundary(false);
										}}
										onCancel={() => setIsDrawingBoundary(false)}
									/>
								)}
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
