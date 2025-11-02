"use client";

import { getPropertyTypeColor } from "@/lib/utils";
import { MapViewport, Property, SurveyData } from "@/types/property";
import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";

export type MapboxStyleType =
	| "streets"
	| "satellite"
	| "outdoors"
	| "satellite-streets";

interface MapboxMapProps {
	properties: Property[];
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;
	onPropertyClick?: (property: Property) => void;
	selectedProperty?: Property | null;
	showCustomBoundaries?: boolean;
	className?: string;
	isDrawingBoundary?: boolean;
	onBoundaryComplete?: (surveyData: SurveyData) => void;
	onDrawingCancel?: () => void;
	mapStyle?: MapboxStyleType;
}

// You'll need to set this in your .env.local file
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const MAPBOX_STYLES = {
	streets: "mapbox://styles/mapbox/streets-v12",
	satellite: "mapbox://styles/mapbox/satellite-v9",
	outdoors: "mapbox://styles/mapbox/outdoors-v12",
	"satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
};

export default function MapboxMap({
	properties,
	viewport,
	onViewportChange,
	onPropertyClick,
	selectedProperty,
	showCustomBoundaries = true,
	className = "",
	isDrawingBoundary = false,
	onBoundaryComplete,
	onDrawingCancel,
	mapStyle = "streets",
}: MapboxMapProps) {
	const mapRef = useRef<any>(null);
	const isAnimatingRef = useRef(false);
	const [popupInfo, setPopupInfo] = useState<Property | null>(null);
	const [viewState, setViewState] = useState({
		longitude: viewport.center[1],
		latitude: viewport.center[0],
		zoom: viewport.zoom,
	});

	// Update internal view state when viewport prop changes
	useEffect(() => {
		const map = mapRef.current?.getMap();
		if (map && !isAnimatingRef.current) {
			isAnimatingRef.current = true;
			// Use flyTo for smooth animation
			map.flyTo({
				center: [viewport.center[1], viewport.center[0]],
				zoom: viewport.zoom,
				duration: 1500, // 1.5 seconds animation
			});

			// Reset flag after animation completes
			setTimeout(() => {
				isAnimatingRef.current = false;
			}, 1600);
		} else if (!map) {
			// Fallback if map isn't ready yet
			setViewState({
				longitude: viewport.center[1],
				latitude: viewport.center[0],
				zoom: viewport.zoom,
			});
		}
	}, [viewport.center, viewport.zoom]);

	const handleMove = useCallback(
		(evt: any) => {
			setViewState(evt.viewState);

			// Don't notify parent during programmatic flyTo animations
			if (isAnimatingRef.current) return;

			// Notify parent of viewport changes
			if (onViewportChange) {
				const map = mapRef.current?.getMap();
				if (map) {
					const bounds = map.getBounds();
					onViewportChange({
						center: [evt.viewState.latitude, evt.viewState.longitude],
						zoom: evt.viewState.zoom,
						bounds: [
							[bounds.getSouth(), bounds.getWest()],
							[bounds.getNorth(), bounds.getEast()],
						],
					});
				}
			}
		},
		[onViewportChange]
	);

	const createMarkerColor = (property: Property, isSelected: boolean) => {
		const baseColor = getPropertyTypeColor(property.propertyType);
		return isSelected ? "#3B82F6" : baseColor;
	};

	if (!MAPBOX_TOKEN) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-gray-100">
				<div className="text-center p-6 bg-white rounded-lg shadow-lg">
					<p className="text-red-600 font-semibold mb-2">
						⚠️ Mapbox Token Missing
					</p>
					<p className="text-sm text-gray-600">
						Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file
					</p>
					<a
						href="https://account.mapbox.com/access-tokens/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 text-sm underline mt-2 inline-block"
					>
						Get a token from Mapbox
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className={`h-full w-full ${className}`}>
			<Map
				ref={mapRef}
				{...viewState}
				onMove={handleMove}
				mapStyle={MAPBOX_STYLES[mapStyle]}
				mapboxAccessToken={MAPBOX_TOKEN}
				style={{ width: "100%", height: "100%" }}
				minZoom={10}
				maxZoom={22}
			>
				{/* Property Markers */}
				{properties.map((property) => (
					<Marker
						key={property.id}
						longitude={property.coordinates.lng}
						latitude={property.coordinates.lat}
						anchor="center"
						onClick={(e) => {
							e.originalEvent?.stopPropagation();
							onPropertyClick?.(property);
							setPopupInfo(property);
						}}
					>
						<div
							className="cursor-pointer transition-transform hover:scale-110"
							style={{
								width: selectedProperty?.id === property.id ? "30px" : "24px",
								height: selectedProperty?.id === property.id ? "30px" : "24px",
								backgroundColor: createMarkerColor(
									property,
									selectedProperty?.id === property.id
								),
								border: `${
									selectedProperty?.id === property.id ? "3px" : "2px"
								} solid ${
									selectedProperty?.id === property.id ? "#3B82F6" : "white"
								}`,
								borderRadius: "4px",
								boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "10px",
								fontWeight: "bold",
								color: "white",
							}}
						>
							{property.id}
						</div>
					</Marker>
				))}

				{/* Popup */}
				{popupInfo && (
					<Popup
						longitude={popupInfo.coordinates.lng}
						latitude={popupInfo.coordinates.lat}
						anchor="top"
						onClose={() => setPopupInfo(null)}
						closeOnClick={false}
					>
						<div className="p-2 min-w-[200px]">
							<h3 className="font-semibold text-lg mb-2">{popupInfo.name}</h3>
							<p className="text-sm text-gray-600 mb-1">{popupInfo.address}</p>
							<p className="text-sm mb-1">
								<span className="font-medium">Type:</span>{" "}
								{popupInfo.propertyType}
							</p>
							<p className="text-sm mb-1">
								<span className="font-medium">Status:</span> {popupInfo.status}
							</p>
							{popupInfo.currentValue && (
								<p className="text-sm font-medium text-green-600">
									₦{popupInfo.currentValue.toLocaleString()}
								</p>
							)}
						</div>
					</Popup>
				)}

				{/* Custom boundaries - to be implemented */}
				{showCustomBoundaries && selectedProperty?.surveyData && (
					<div className="hidden">
						{/* TODO: Implement boundary rendering with Mapbox layers */}
					</div>
				)}
			</Map>
		</div>
	);
}
