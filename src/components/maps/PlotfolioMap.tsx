"use client";

import {
	MapViewport,
	Property,
	PropertyGrid,
	SurveyData,
} from "@/types/property";
import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Map provider types
export type MapProvider = "leaflet" | "mapbox" | "google";
export type MapViewMode = "standard" | "satellite" | "terrain" | "hybrid";

// Dynamically import provider-specific maps
const PropertyMap = dynamic(() => import("./PropertyMap"), {
	ssr: false,
}) as ComponentType<any>;
const MapboxMap = dynamic(() => import("./MapboxMap"), {
	ssr: false,
}) as ComponentType<any>;
const GoogleMapComponent = dynamic(() => import("./GoogleMapComponent"), {
	ssr: false,
}) as ComponentType<any>;

interface PlotfolioMapProps {
	// Map provider
	provider: MapProvider;
	viewMode?: MapViewMode;
	onViewModeChange?: (mode: MapViewMode) => void;

	// Property data
	properties: Property[];
	selectedProperty?: Property | null;
	onPropertyClick?: (property: Property) => void;

	// Viewport control
	viewport: MapViewport;
	onViewportChange?: (viewport: MapViewport) => void;

	// Display toggles
	showCustomBoundaries?: boolean;
	showGrid?: boolean;
	showPropertyGrids?: boolean;
	showStateBorders?: boolean;
	onGridToggle?: () => void;
	onRegionHover?: (regionName: string | null) => void;
	onRegionClick?: (regionName: string) => void;

	// Drawing/editing modes
	isDrawingBoundary?: boolean;
	isSelectingGrid?: boolean;
	onBoundaryComplete?: (surveyData: SurveyData) => void;
	onDrawingCancel?: () => void;
	onGridComplete?: (grid: PropertyGrid) => void;
	onGridCancel?: () => void;

	// Styling
	className?: string;
}

export default function PlotfolioMap({
	provider,
	viewMode = "standard",
	onViewModeChange,
	properties,
	selectedProperty,
	onPropertyClick,
	viewport,
	onViewportChange,
	showCustomBoundaries = false,
	showGrid = false,
	showPropertyGrids = false,
	showStateBorders = true,
	onGridToggle,
	onRegionHover,
	onRegionClick,
	isDrawingBoundary = false,
	isSelectingGrid = false,
	onBoundaryComplete,
	onDrawingCancel,
	onGridComplete,
	onGridCancel,
	className = "",
}: PlotfolioMapProps) {
	// Common props for all map providers
	const commonProps = {
		properties,
		selectedProperty,
		onPropertyClick,
		viewport,
		onViewportChange,
		showCustomBoundaries,
		showGrid,
		showPropertyGrids,
		showStateBorders,
		onGridToggle,
		onRegionHover,
		onRegionClick,
		isDrawingBoundary,
		isSelectingGrid,
		onBoundaryComplete,
		onDrawingCancel,
		onGridComplete,
		onGridCancel,
		className,
	};

	// Map view mode to provider-specific types
	const getMapboxStyle = (
		mode: MapViewMode
	): "streets" | "satellite" | "outdoors" | "satellite-streets" => {
		switch (mode) {
			case "standard":
				return "streets";
			case "satellite":
				return "satellite";
			case "terrain":
				return "outdoors";
			case "hybrid":
				return "satellite-streets";
			default:
				return "streets";
		}
	};

	// Render based on provider
	switch (provider) {
		case "leaflet":
			return <PropertyMap {...commonProps} layerType={viewMode} />;

		case "mapbox":
			return <MapboxMap {...commonProps} mapStyle={getMapboxStyle(viewMode)} />;

		case "google":
			return <GoogleMapComponent {...commonProps} mapType={viewMode} />;

		default:
			return (
				<div
					className={`flex items-center justify-center bg-gray-100 ${className}`}
				>
					<p className="text-gray-500">Invalid map provider: {provider}</p>
				</div>
			);
	}
}
