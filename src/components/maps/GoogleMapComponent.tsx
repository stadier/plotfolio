"use client";

import { getPropertyTypeColor } from "@/lib/utils";
import {
	MapViewport,
	Property,
	PropertyGrid,
	SurveyData,
} from "@/types/property";
import {
	AdvancedMarker,
	APIProvider,
	InfoWindow,
	Map,
	useMap,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import AdministrativeBoundaries from "./AdministrativeBoundaries";
import GoogleMapsBoundaryDrawer from "./GoogleMapsBoundaryDrawer";
import GoogleMapsGridSelector from "./GoogleMapsGridSelector";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type GoogleMapType = "standard" | "satellite" | "terrain" | "hybrid";

// Controller to update map type
function MapTypeController({ mapTypeId }: { mapTypeId: string }) {
	const map = useMap();

	useEffect(() => {
		if (map) {
			map.setMapTypeId(mapTypeId);
		}
	}, [map, mapTypeId]);

	return null;
}

// Controller to handle viewport changes
function ViewportController({ viewport }: { viewport: MapViewport }) {
	const map = useMap();
	const isAnimatingRef = useRef(false);
	const lastViewportRef = useRef<string>("");
	const isUserInteractingRef = useRef(false);

	useEffect(() => {
		if (!map || !viewport.center || !viewport.zoom) return;

		const currentViewportKey = `${viewport.center[0]},${viewport.center[1]},${viewport.zoom}`;

		// Skip if already at this position, currently animating, or user is interacting
		if (
			currentViewportKey === lastViewportRef.current ||
			isAnimatingRef.current ||
			isUserInteractingRef.current
		) {
			return;
		}

		isAnimatingRef.current = true;
		lastViewportRef.current = currentViewportKey;

		// Smoothly pan and zoom
		map.panTo({ lat: viewport.center[0], lng: viewport.center[1] });
		map.setZoom(viewport.zoom);

		// Reset animation flag after a delay
		setTimeout(() => {
			isAnimatingRef.current = false;
		}, 500);
	}, [map, viewport.center, viewport.zoom]);

	// Listen for user drag events
	useEffect(() => {
		if (!map) return;

		const dragStartListener = map.addListener("dragstart", () => {
			isUserInteractingRef.current = true;
		});

		const dragEndListener = map.addListener("dragend", () => {
			setTimeout(() => {
				isUserInteractingRef.current = false;
			}, 100);
		});

		return () => {
			dragStartListener.remove();
			dragEndListener.remove();
		};
	}, [map]);

	return null;
}

// Grid Overlay Component for Google Maps
function GridOverlay({
	viewport,
	showGrid,
}: {
	viewport: MapViewport;
	showGrid: boolean;
}) {
	const map = useMap();

	useEffect(() => {
		if (!map || !showGrid) return;

		const bounds = map.getBounds();
		if (!bounds) return;

		const ne = bounds.getNorthEast();
		const sw = bounds.getSouthWest();

		// Grid configuration (30m x 30m cells)
		const gridSize = 30; // meters
		const latDegPerMeter = 1 / 111000;
		const centerLat = (ne.lat() + sw.lat()) / 2;
		const lngDegPerMeter = 1 / (111000 * Math.cos((centerLat * Math.PI) / 180));

		const gridLatStep = gridSize * latDegPerMeter;
		const gridLngStep = gridSize * lngDegPerMeter;

		// Create grid lines
		const gridLines: google.maps.Polyline[] = [];

		// Vertical lines
		for (let lng = sw.lng(); lng <= ne.lng(); lng += gridLngStep) {
			const line = new google.maps.Polyline({
				path: [
					{ lat: sw.lat(), lng },
					{ lat: ne.lat(), lng },
				],
				strokeColor: "#3B82F6",
				strokeOpacity: 0.3,
				strokeWeight: 1,
				map,
			});
			gridLines.push(line);
		}

		// Horizontal lines
		for (let lat = sw.lat(); lat <= ne.lat(); lat += gridLatStep) {
			const line = new google.maps.Polyline({
				path: [
					{ lat, lng: sw.lng() },
					{ lat, lng: ne.lng() },
				],
				strokeColor: "#3B82F6",
				strokeOpacity: 0.3,
				strokeWeight: 1,
				map,
			});
			gridLines.push(line);
		}

		// Cleanup function
		return () => {
			gridLines.forEach((line) => line.setMap(null));
		};
	}, [map, showGrid, viewport.zoom, viewport.center]);

	return null;
}

// Property Boundaries Overlay Component
function PropertyBoundariesOverlay({
	properties,
	selectedPropertyId,
}: {
	properties: Property[];
	selectedPropertyId?: string | null;
}) {
	const map = useMap();

	useEffect(() => {
		if (!map) return;

		const polygons: google.maps.Polygon[] = [];

		properties.forEach((property) => {
			// Only show properties that have surveyData with coordinates
			if (
				!property.surveyData ||
				!property.surveyData.coordinates ||
				property.surveyData.coordinates.length < 3
			) {
				return;
			}

			const isSelected = property.id === selectedPropertyId;

			// Convert coordinates to Google Maps format
			const path = property.surveyData.coordinates.map((coord) => ({
				lat: coord.lat,
				lng: coord.lng,
			}));

			// Create polygon for the boundary
			const polygon = new google.maps.Polygon({
				paths: path,
				strokeColor: isSelected ? "#8B5CF6" : "#3B82F6",
				strokeOpacity: 0.8,
				strokeWeight: isSelected ? 3 : 2,
				fillColor: isSelected ? "#8B5CF6" : "#3B82F6",
				fillOpacity: isSelected ? 0.25 : 0.15,
				map,
			});

			polygons.push(polygon);
		});

		return () => {
			polygons.forEach((polygon) => polygon.setMap(null));
		};
	}, [map, properties, selectedPropertyId]);

	return null;
}

// Property Grid Overlay Component for Google Maps
function PropertyGridOverlay({
	properties,
	selectedPropertyId,
	showPropertyGrids,
}: {
	properties: Property[];
	selectedPropertyId?: string | null;
	showPropertyGrids: boolean;
}) {
	const map = useMap();

	useEffect(() => {
		if (!map || !showPropertyGrids) return;

		const polygons: google.maps.Polygon[] = [];

		properties.forEach((property) => {
			if (!property.propertyGrid || !property.propertyGrid.cells.length) return;

			const isSelected = property.id === selectedPropertyId;
			const grid = property.propertyGrid;

			// Convert meters to degrees for this property's location
			const latDegPerMeter = 1 / 111000;
			const lngDegPerMeter =
				1 / (111000 * Math.cos((property.coordinates.lat * Math.PI) / 180));
			const gridLatStep = grid.gridSize * latDegPerMeter;
			const gridLngStep = grid.gridSize * lngDegPerMeter;

			grid.cells.forEach((cell) => {
				const polygon = new google.maps.Polygon({
					paths: [
						{ lat: cell.lat, lng: cell.lng },
						{ lat: cell.lat + gridLatStep, lng: cell.lng },
						{ lat: cell.lat + gridLatStep, lng: cell.lng + gridLngStep },
						{ lat: cell.lat, lng: cell.lng + gridLngStep },
					],
					strokeColor: isSelected ? "#10B981" : grid.color || "#10B981",
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: isSelected ? "#10B981" : grid.color || "#10B981",
					fillOpacity: isSelected ? 0.3 : 0.2,
					map,
				});
				polygons.push(polygon);
			});
		});

		return () => {
			polygons.forEach((polygon) => polygon.setMap(null));
		};
	}, [map, properties, selectedPropertyId, showPropertyGrids]);

	return null;
}

interface GoogleMapComponentProps {
	properties: Property[];
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;
	onPropertyClick?: (property: Property) => void;
	selectedProperty?: Property | null;
	showCustomBoundaries?: boolean;
	showGrid?: boolean;
	showPropertyGrids?: boolean;
	showStateBorders?: boolean;
	onGridToggle?: () => void;
	onRegionHover?: (regionName: string | null) => void;
	onRegionClick?: (regionName: string) => void;
	className?: string;
	isDrawingBoundary?: boolean;
	isSelectingGrid?: boolean;
	onBoundaryComplete?: (surveyData: SurveyData) => void;
	onDrawingCancel?: () => void;
	onGridComplete?: (grid: PropertyGrid) => void;
	onGridCancel?: () => void;
	mapType?: GoogleMapType;
}

// Map Google map types to Google Maps API map type IDs
const getGoogleMapTypeId = (type: GoogleMapType): string => {
	switch (type) {
		case "standard":
			return "roadmap";
		case "satellite":
			return "satellite";
		case "terrain":
			return "terrain";
		case "hybrid":
			return "hybrid";
		default:
			return "roadmap";
	}
};

export default function GoogleMapComponent({
	properties,
	viewport,
	onViewportChange,
	onPropertyClick,
	selectedProperty,
	showCustomBoundaries = false,
	showGrid = false,
	showPropertyGrids = false,
	showStateBorders = true,
	onRegionHover,
	onRegionClick,
	isDrawingBoundary = false,
	isSelectingGrid = false,
	onBoundaryComplete,
	onDrawingCancel,
	onGridComplete,
	onGridCancel,
	mapType = "standard",
	className = "",
}: GoogleMapComponentProps) {
	const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
	const [currentMapTypeId, setCurrentMapTypeId] = useState(
		getGoogleMapTypeId(mapType)
	);

	const center = viewport.center
		? { lat: viewport.center[0], lng: viewport.center[1] }
		: { lat: 9.0765, lng: 7.4951 }; // Abuja, Nigeria

	// Update map type when prop changes
	useEffect(() => {
		setCurrentMapTypeId(getGoogleMapTypeId(mapType));
	}, [mapType]);

	const handleCameraChange = useCallback(
		(ev: any) => {
			if (!onViewportChange) return;

			const { center, zoom, bounds } = ev.detail;

			onViewportChange({
				center: [center.lat, center.lng],
				zoom,
				bounds: bounds
					? [
							[bounds.south, bounds.west],
							[bounds.north, bounds.east],
					  ]
					: undefined,
			});
		},
		[onViewportChange]
	);

	const handleMarkerClick = useCallback(
		(property: Property) => {
			setSelectedMarker(property.id);
			if (onPropertyClick) {
				onPropertyClick(property);
			}
		},
		[onPropertyClick]
	);

	return (
		<APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
			<div className={`relative w-full h-full ${className}`}>
				<Map
					mapId="plotfolio-map"
					defaultCenter={center}
					defaultZoom={viewport.zoom || 13}
					gestureHandling="greedy"
					disableDefaultUI={true}
					onCameraChanged={handleCameraChange}
					style={{ width: "100%", height: "100%" }}
					clickableIcons={true}
					draggable={true}
					scrollwheel={true}
					disableDoubleClickZoom={false}
				>
					<MapTypeController mapTypeId={currentMapTypeId} />
					<ViewportController viewport={viewport} />
					<AdministrativeBoundaries
						showBorders={showStateBorders}
						onRegionHover={onRegionHover}
						onRegionClick={onRegionClick}
					/>
					<GridOverlay viewport={viewport} showGrid={showGrid} />
					<PropertyGridOverlay
						properties={properties}
						selectedPropertyId={selectedProperty?.id}
						showPropertyGrids={showPropertyGrids}
					/>

					{/* Property Boundaries */}
					{showCustomBoundaries && (
						<PropertyBoundariesOverlay
							properties={properties}
							selectedPropertyId={selectedProperty?.id}
						/>
					)}

					{/* Property Markers */}
					{properties.map((property) => (
						<AdvancedMarker
							key={property.id}
							position={{
								lat: property.coordinates.lat,
								lng: property.coordinates.lng,
							}}
							onClick={() => handleMarkerClick(property)}
						>
							<div
								className="w-8 h-8 rounded-full border-4 border-white shadow-lg cursor-pointer transform transition-transform hover:scale-110"
								style={{
									backgroundColor: getPropertyTypeColor(property.propertyType),
								}}
							/>
						</AdvancedMarker>
					))}

					{/* Info Window for selected marker */}
					{selectedMarker && (
						<InfoWindow
							position={
								properties.find((p) => p.id === selectedMarker)
									? {
											lat: properties.find((p) => p.id === selectedMarker)!
												.coordinates.lat,
											lng: properties.find((p) => p.id === selectedMarker)!
												.coordinates.lng,
									  }
									: center
							}
							onCloseClick={() => setSelectedMarker(null)}
						>
							<div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg min-w-[200px] border-0 relative">
								{/* Custom close button */}
								<button
									onClick={() => setSelectedMarker(null)}
									className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition-colors duration-200"
									title="Close tooltip"
								>
									×
								</button>
								<h3 className="font-bold text-sm text-white mb-2 pr-4">
									{properties.find((p) => p.id === selectedMarker)?.name}
								</h3>
								<p className="text-xs text-gray-300 mb-1">
									{properties
										.find((p) => p.id === selectedMarker)
										?.coordinates.lat?.toFixed(6)}
									°N{" "}
									{properties
										.find((p) => p.id === selectedMarker)
										?.coordinates.lng?.toFixed(6)}
									°E
								</p>
								<p className="text-xs text-gray-300">
									{properties
										.find((p) => p.id === selectedMarker)
										?.area.toLocaleString()}{" "}
									m²
								</p>
								<p className="text-xs text-gray-400 mt-2 italic">
									Click × or outside to dismiss
								</p>
							</div>
						</InfoWindow>
					)}
				</Map>

				{/* Boundary Drawer */}
				{isDrawingBoundary &&
					selectedProperty &&
					onBoundaryComplete &&
					onDrawingCancel && (
						<GoogleMapsBoundaryDrawer
							propertyId={selectedProperty.id}
							onBoundaryComplete={onBoundaryComplete}
							onCancel={onDrawingCancel}
							existingBoundary={selectedProperty.surveyData}
						/>
					)}

				{/* Grid Selector */}
				{isSelectingGrid &&
					selectedProperty &&
					onGridComplete &&
					onGridCancel && (
						<GoogleMapsGridSelector
							propertyId={selectedProperty.id}
							propertyCenter={selectedProperty.coordinates}
							existingGrid={selectedProperty.propertyGrid}
							onGridComplete={onGridComplete}
							onCancel={onGridCancel}
						/>
					)}
			</div>
		</APIProvider>
	);
}
