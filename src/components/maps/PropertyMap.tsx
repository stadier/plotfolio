"use client";

import { getPropertyTypeColor } from "@/lib/utils";
import { MapViewport, Property } from "@/types/property";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import CustomPlotBoundary from "./CustomPlotBoundary";
import PlotGridInfo from "./PlotGridInfo";
import PlotGridOverlay from "./PlotGridOverlay";
import PlotZoomControl from "./PlotZoomControl";

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

interface PropertyMapProps {
	properties: Property[];
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;
	onPropertyClick?: (property: Property) => void;
	selectedProperty?: Property | null;
	showCustomBoundaries?: boolean;
	className?: string;
}

function MapController({
	onViewportChange,
}: {
	onViewportChange?: (viewport: MapViewport) => void;
}) {
	const map = useMap();

	useEffect(() => {
		if (onViewportChange) {
			const handleMoveEnd = () => {
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

export default function PropertyMap({
	properties,
	viewport,
	onViewportChange,
	onPropertyClick,
	selectedProperty,
	showCustomBoundaries = true,
	className = "",
}: PropertyMapProps) {
	const createCustomIcon = (
		property: Property,
		isSelected: boolean = false
	) => {
		const color = getPropertyTypeColor(property.propertyType);
		const size = isSelected ? 30 : 24;
		const borderColor = isSelected ? "#3B82F6" : "white";
		const borderWidth = isSelected ? 3 : 2;

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
				className="h-full w-full rounded-lg"
				zoomControl={true}
				scrollWheelZoom={true}
			>
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				/>

				<MapController onViewportChange={onViewportChange} />

				{/* Plot Grid Overlay for land visualization - Disabled for custom survey overlays */}
				<PlotGridOverlay
					gridSize={30}
					showGrid={false} // Disabled - using custom survey boundaries instead
					gridColor="#059669"
					gridOpacity={0.4}
				/>

				{/* Custom Plot Zoom Control */}
				<PlotZoomControl minZoom={13} maxZoom={19} plotViewZoom={16} />

				{/* Custom Plot Boundaries from Survey Documents */}
				{showCustomBoundaries && (
					<CustomPlotBoundary
						surveyData={properties
							.filter((p) => p.surveyData)
							.map((p) => p.surveyData!)}
						selectedPlotId={selectedProperty?.surveyData?.plotNumber}
						onPlotClick={(surveyData) => {
							const property = properties.find(
								(p) => p.surveyData?.plotNumber === surveyData.plotNumber
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
							selectedProperty?.id === property.id
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
			</MapContainer>

			{/* Plot Grid Information Panel */}
			<PlotGridInfo />
		</div>
	);
}
