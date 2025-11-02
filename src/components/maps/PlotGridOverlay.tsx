import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface PlotGridOverlayProps {
	gridSize?: number; // Grid cell size in meters (typical plot size)
	showGrid?: boolean;
	gridColor?: string;
	gridOpacity?: number;
}

export default function PlotGridOverlay({
	gridSize = 40, // ~40m x 40m grid cells (approx 1600 sqm, larger than typical plots)
	showGrid = true,
	gridColor = "#3B82F6",
	gridOpacity = 0.3,
}: PlotGridOverlayProps) {
	const map = useMap();

	useEffect(() => {
		if (!showGrid) return;

		let gridLayer: L.LayerGroup | null = null;

		const createGrid = () => {
			if (gridLayer) {
				map.removeLayer(gridLayer);
			}

			gridLayer = L.layerGroup();
			const bounds = map.getBounds();

			// Convert grid size from meters to degrees (approximate)
			// At Abuja's latitude (~9°), 1 degree ≈ 111km
			const latDegPerMeter = 1 / 111000;
			const lngDegPerMeter = 1 / (111000 * Math.cos((9 * Math.PI) / 180));

			const gridLatStep = gridSize * latDegPerMeter;
			const gridLngStep = gridSize * lngDegPerMeter;

			// Extend bounds slightly to ensure grid covers visible area
			const south = bounds.getSouth() - gridLatStep;
			const north = bounds.getNorth() + gridLatStep;
			const west = bounds.getWest() - gridLngStep;
			const east = bounds.getEast() + gridLngStep;

			// Draw vertical lines
			for (
				let lng = Math.floor(west / gridLngStep) * gridLngStep;
				lng <= east;
				lng += gridLngStep
			) {
				const line = L.polyline(
					[
						[south, lng],
						[north, lng],
					],
					{
						color: gridColor,
						weight: 1,
						opacity: gridOpacity,
						interactive: false,
					}
				);
				gridLayer.addLayer(line);
			}

			// Draw horizontal lines
			for (
				let lat = Math.floor(south / gridLatStep) * gridLatStep;
				lat <= north;
				lat += gridLatStep
			) {
				const line = L.polyline(
					[
						[lat, west],
						[lat, east],
					],
					{
						color: gridColor,
						weight: 1,
						opacity: gridOpacity,
						interactive: false,
					}
				);
				gridLayer.addLayer(line);
			}

			gridLayer.addTo(map);
		};

		// Create initial grid
		createGrid();

		// Recreate grid when map moves or zooms
		const handleMapChange = () => {
			// Only recreate grid if zoom level is appropriate for plot visualization
			if (map.getZoom() >= 13) {
				createGrid();
			} else if (gridLayer) {
				map.removeLayer(gridLayer);
				gridLayer = null;
			}
		};

		map.on("moveend", handleMapChange);
		map.on("zoomend", handleMapChange);

		return () => {
			if (gridLayer) {
				map.removeLayer(gridLayer);
			}
			map.off("moveend", handleMapChange);
			map.off("zoomend", handleMapChange);
		};
	}, [map, gridSize, showGrid, gridColor, gridOpacity]);

	return null;
}
