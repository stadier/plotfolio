"use client";

import { getMapTiles } from "@/lib/mapTiles";
import { getPropertyImageUrls, getPropertyTypeColor } from "@/lib/utils";
import {
	MapViewport,
	Property,
	PropertyGrid,
	SurveyData,
} from "@/types/property";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import CustomPlotBoundary from "./CustomPlotBoundary";
import ManualBoundaryDrawer from "./ManualBoundaryDrawer";
import PlotGridOverlay from "./PlotGridOverlay";
import PropertyGridOverlayComponent from "./PropertyGridOverlayComponent";
import PropertyGridSelector from "./PropertyGridSelector";

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
	._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export type MapLayerType = "standard" | "satellite" | "terrain" | "hybrid";

interface PropertyMapProps {
	properties: Property[];
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;
	onPropertyClick?: (property: Property) => void;
	selectedProperty?: Property | null;
	showCustomBoundaries?: boolean;
	showGrid?: boolean;
	showPropertyGrids?: boolean;
	onGridToggle?: () => void;
	className?: string;
	isDrawingBoundary?: boolean;
	isSelectingGrid?: boolean;
	onBoundaryComplete?: (surveyData: SurveyData) => void;
	onDrawingCancel?: () => void;
	onGridComplete?: (grid: PropertyGrid) => void;
	onGridCancel?: () => void;
	useImageMarkers?: boolean;
	layerType?: MapLayerType;
}

function MapController({
	viewport,
	onViewportChange,
}: {
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;
}) {
	const map = useMap();
	const isAnimatingRef = useRef(false);

	// Fly to new location when viewport changes externally
	useEffect(() => {
		if (viewport.center && viewport.zoom && !isAnimatingRef.current) {
			// Skip if the map is already at the target position (e.g. from user pan/zoom)
			const currentCenter = map.getCenter();
			const currentZoom = map.getZoom();
			if (
				Math.abs(currentCenter.lat - viewport.center[0]) < 0.0001 &&
				Math.abs(currentCenter.lng - viewport.center[1]) < 0.0001 &&
				Math.abs(currentZoom - viewport.zoom) < 0.1
			) {
				return;
			}

			isAnimatingRef.current = true;
			map.flyTo(viewport.center, viewport.zoom, {
				duration: 1.5, // Smooth animation
			});

			// Reset flag after animation completes
			setTimeout(() => {
				isAnimatingRef.current = false;
			}, 1600);
		}
	}, [map, viewport.center, viewport.zoom]);

	useEffect(() => {
		if (onViewportChange) {
			const handleMoveEnd = () => {
				// Don't trigger updates during programmatic flyTo
				if (isAnimatingRef.current) return;

				const center = map.getCenter();
				const zoom = map.getZoom();
				const bounds = map.getBounds();

				onViewportChange({
					center: [center.lat, center.lng],
					zoom,
					bounds: [
						[bounds.getSouth(), bounds.getWest()],
						[bounds.getNorth(), bounds.getEast()],
					],
				});
			};

			map.on("moveend", handleMoveEnd);
			map.on("zoomend", handleMoveEnd);

			return () => {
				map.off("moveend", handleMoveEnd);
				map.off("zoomend", handleMoveEnd);
			};
		}
	}, [map, onViewportChange]);

	return null;
}

// Tile layer configurations (from centralized provider)
const TILE_LAYERS = getMapTiles();

export default function PropertyMap({
	properties,
	viewport,
	onViewportChange,
	onPropertyClick,
	selectedProperty,
	showCustomBoundaries = true,
	showGrid = false,
	showPropertyGrids = true,
	onGridToggle,
	className = "",
	isDrawingBoundary = false,
	isSelectingGrid = false,
	onBoundaryComplete,
	onDrawingCancel,
	onGridComplete,
	onGridCancel,
	useImageMarkers = true,
	layerType = "standard",
}: PropertyMapProps) {
	const currentLayer = TILE_LAYERS[layerType];
	const createCustomIcon = (
		property: Property,
		isSelected: boolean = false,
	) => {
		const color = getPropertyTypeColor(property.propertyType);
		const imageUrls = getPropertyImageUrls(property);
		const hasImage = useImageMarkers && imageUrls.length > 0;
		const size = hasImage ? (isSelected ? 56 : 48) : isSelected ? 30 : 24;
		const borderColor = isSelected ? "#3B82F6" : "white";
		const borderWidth = isSelected ? 3 : 2;

		if (hasImage) {
			return L.divIcon({
				className: "custom-property-marker",
				html: `
					<div style="
						width: ${size}px;
						height: ${size}px;
						border: ${borderWidth}px solid ${borderColor};
						border-radius: 10px;
						box-shadow: 0 2px 8px rgba(0,0,0,0.3);
						overflow: hidden;
						background: white;
						${isSelected ? "transform: scale(1.1);" : ""}
					">
						<img src="${imageUrls[0]}" style="
							width: 100%;
							height: 100%;
							object-fit: cover;
						" alt="" />
					</div>
				`,
				iconSize: [size, size],
				iconAnchor: [size / 2, size / 2],
			});
		}

		return L.divIcon({
			className: "custom-property-marker",
			html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: ${borderWidth}px solid ${borderColor};
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
          ${isSelected ? "transform: scale(1.15);" : ""}
        ">
          ${property.id}
        </div>
      `,
			iconSize: [size, size],
			iconAnchor: [size / 2, size / 2],
		});
	};

	return (
		<div className={`h-full w-full ${className}`}>
			<MapContainer
				center={viewport.center}
				zoom={viewport.zoom}
				className="h-full w-full"
				zoomControl={false}
				scrollWheelZoom={true}
				minZoom={10}
				maxZoom={19}
			>
				<TileLayer
					url={currentLayer.url}
					attribution={currentLayer.attribution}
					maxZoom={currentLayer.maxZoom}
					maxNativeZoom={currentLayer.maxZoom}
				/>

				{/* Overlay layer for hybrid view */}
				{layerType === "hybrid" &&
					"overlay" in currentLayer &&
					currentLayer.overlay && (
						<TileLayer
							url={currentLayer.overlay.url}
							attribution={currentLayer.overlay.attribution}
							maxZoom={currentLayer.overlay.maxZoom}
							maxNativeZoom={currentLayer.overlay.maxZoom}
							opacity={currentLayer.overlay.opacity}
						/>
					)}

				<MapController
					viewport={viewport}
					onViewportChange={onViewportChange}
				/>

				{/* Plot Grid Overlay for land visualization */}
				<PlotGridOverlay
					gridSize={30}
					showGrid={showGrid}
					gridColor="#059669"
					gridOpacity={0.4}
				/>

				{/* Custom Plot Boundaries from Survey Documents */}
				{showCustomBoundaries && (
					<CustomPlotBoundary
						surveyData={properties
							.filter((p) => p.surveyData)
							.map((p) => p.surveyData!)}
						selectedPlotId={selectedProperty?.surveyData?.plotNumber}
						onPlotClick={(surveyData) => {
							const property = properties.find(
								(p) => p.surveyData?.plotNumber === surveyData.plotNumber,
							);
							if (property) onPropertyClick?.(property);
						}}
					/>
				)}

				{properties.map((property) => (
					<Marker
						key={property.id}
						position={[property.coordinates.lat, property.coordinates.lng]}
						icon={createCustomIcon(
							property,
							selectedProperty?.id === property.id,
						)}
						eventHandlers={{
							click: () => onPropertyClick?.(property),
						}}
					>
						<Popup>
							<div className="p-2 min-w-[200px]">
								<h3 className="font-semibold text-lg mb-2">{property.name}</h3>
								<p className="text-sm text-gray-600 mb-1">{property.address}</p>
								<p className="text-sm mb-1">
									<span className="font-medium">Type:</span>{" "}
									{property.propertyType}
								</p>
								<p className="text-sm mb-1">
									<span className="font-medium">Status:</span> {property.status}
								</p>
								{property.currentValue && (
									<p className="text-sm font-medium text-green-600">
										₦{property.currentValue.toLocaleString()}
									</p>
								)}
							</div>
						</Popup>
					</Marker>
				))}

				{/* Manual Boundary Drawer */}
				{isDrawingBoundary &&
					selectedProperty &&
					onBoundaryComplete &&
					onDrawingCancel && (
						<ManualBoundaryDrawer
							propertyId={selectedProperty.id}
							existingBoundary={selectedProperty.surveyData}
							onBoundaryComplete={onBoundaryComplete}
							onCancel={onDrawingCancel}
						/>
					)}

				{/* Property Grid Selector */}
				{isSelectingGrid &&
					selectedProperty &&
					onGridComplete &&
					onGridCancel && (
						<PropertyGridSelector
							propertyId={selectedProperty.id}
							propertyCenter={selectedProperty.coordinates}
							existingGrid={selectedProperty.propertyGrid}
							onGridComplete={onGridComplete}
							onCancel={onGridCancel}
						/>
					)}

				{/* Property Grid Overlay */}
				<PropertyGridOverlayComponent
					properties={properties}
					selectedPropertyId={selectedProperty?.id}
					showPropertyGrids={showPropertyGrids}
				/>
			</MapContainer>
		</div>
	);
}
