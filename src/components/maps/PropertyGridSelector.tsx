"use client";

import { GridCell, PropertyGrid } from "@/types/property";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";

interface PropertyGridSelectorProps {
	propertyId: string;
	propertyCenter: { lat: number; lng: number };
	existingGrid?: PropertyGrid;
	gridSize?: number;
	onGridComplete: (grid: PropertyGrid) => void;
	onCancel: () => void;
}

export default function PropertyGridSelector({
	propertyId,
	propertyCenter,
	existingGrid,
	gridSize = 30,
	onGridComplete,
	onCancel,
}: PropertyGridSelectorProps) {
	const map = useMap();
	const [selectedCells, setSelectedCells] = useState<GridCell[]>(
		existingGrid?.cells || []
	);
	const gridLayerRef = useRef<L.LayerGroup | null>(null);
	const selectedLayerRef = useRef<L.LayerGroup | null>(null);

	// Convert meters to degrees (approximate)
	const latDegPerMeter = 1 / 111000;
	const lngDegPerMeter =
		1 / (111000 * Math.cos((propertyCenter.lat * Math.PI) / 180));
	const gridLatStep = gridSize * latDegPerMeter;
	const gridLngStep = gridSize * lngDegPerMeter;

	// Function to get grid cell coordinates from a lat/lng point
	const getGridCell = (lat: number, lng: number): GridCell => {
		const cellLat = Math.floor(lat / gridLatStep) * gridLatStep;
		const cellLng = Math.floor(lng / gridLngStep) * gridLngStep;
		return { lat: cellLat, lng: cellLng, gridSize };
	};

	// Check if a cell is already selected
	const isCellSelected = (cell: GridCell): boolean => {
		return selectedCells.some(
			(c) =>
				Math.abs(c.lat - cell.lat) < 0.00001 &&
				Math.abs(c.lng - cell.lng) < 0.00001
		);
	};

	// Draw the grid overlay
	useEffect(() => {
		// Clear existing layers
		if (gridLayerRef.current) {
			map.removeLayer(gridLayerRef.current);
		}
		if (selectedLayerRef.current) {
			map.removeLayer(selectedLayerRef.current);
		}

		gridLayerRef.current = L.layerGroup().addTo(map);
		selectedLayerRef.current = L.layerGroup().addTo(map);

		const bounds = map.getBounds();
		const south = bounds.getSouth() - gridLatStep * 2;
		const north = bounds.getNorth() + gridLatStep * 2;
		const west = bounds.getWest() - gridLngStep * 2;
		const east = bounds.getEast() + gridLngStep * 2;

		// Draw grid cells
		for (
			let lat = Math.floor(south / gridLatStep) * gridLatStep;
			lat <= north;
			lat += gridLatStep
		) {
			for (
				let lng = Math.floor(west / gridLngStep) * gridLngStep;
				lng <= east;
				lng += gridLngStep
			) {
				const cellBounds: [number, number][] = [
					[lat, lng],
					[lat + gridLatStep, lng],
					[lat + gridLatStep, lng + gridLngStep],
					[lat, lng + gridLngStep],
				];

				// Draw grid cell outline - must have fill to be clickable
				const gridCell = L.polygon(cellBounds, {
					color: "#3B82F6",
					weight: 2,
					opacity: 0.5,
					fill: true,
					fillColor: "#3B82F6",
					fillOpacity: 0.05,
					interactive: true,
				}).addTo(gridLayerRef.current!);

				// Make cells clickable
				gridCell.on("click", (e) => {
					L.DomEvent.stopPropagation(e);
					const cell = { lat, lng, gridSize };
					if (isCellSelected(cell)) {
						// Remove cell
						setSelectedCells((prev) =>
							prev.filter(
								(c) =>
									!(
										Math.abs(c.lat - lat) < 0.00001 &&
										Math.abs(c.lng - lng) < 0.00001
									)
							)
						);
					} else {
						// Add cell
						setSelectedCells((prev) => [...prev, cell]);
					}
				});

				// Add hover effects
				gridCell.on("mouseover", () => {
					gridCell.setStyle({
						fillOpacity: 0.2,
						weight: 2,
					});
				});

				gridCell.on("mouseout", () => {
					gridCell.setStyle({
						fillOpacity: 0.05,
						weight: 2,
					});
				});
			}
		}

		return () => {
			if (gridLayerRef.current) {
				map.removeLayer(gridLayerRef.current);
			}
			if (selectedLayerRef.current) {
				map.removeLayer(selectedLayerRef.current);
			}
		};
	}, [map, gridLatStep, gridLngStep]);

	// Draw selected cells
	useEffect(() => {
		if (selectedLayerRef.current) {
			selectedLayerRef.current.clearLayers();

			selectedCells.forEach((cell) => {
				const cellBounds: [number, number][] = [
					[cell.lat, cell.lng],
					[cell.lat + gridLatStep, cell.lng],
					[cell.lat + gridLatStep, cell.lng + gridLngStep],
					[cell.lat, cell.lng + gridLngStep],
				];

				L.polygon(cellBounds, {
					color: "#10B981",
					weight: 2,
					opacity: 0.8,
					fillColor: "#10B981",
					fillOpacity: 0.3,
					interactive: true,
				}).addTo(selectedLayerRef.current!);
			});
		}
	}, [selectedCells, gridLatStep, gridLngStep]);

	const handleSave = () => {
		const propertyGrid: PropertyGrid = {
			cells: selectedCells,
			gridSize,
			color: "#10B981",
		};
		onGridComplete(propertyGrid);
	};

	const handleClear = () => {
		setSelectedCells([]);
	};

	return (
		<div
			className="absolute top-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs"
			style={{ zIndex: 1000 }}
		>
			<h3 className="text-sm font-semibold text-gray-900 mb-2">
				Select Property Grid
			</h3>
			<p className="text-xs text-gray-600 mb-3">
				Click on grid cells to mark your property boundaries. Each cell is{" "}
				{gridSize}m × {gridSize}m.
			</p>

			<div className="text-xs text-gray-700 mb-3">
				<span className="font-medium">{selectedCells.length}</span> cells
				selected
				{selectedCells.length > 0 && (
					<span className="text-gray-500">
						{" "}
						(~{Math.round(
							(selectedCells.length * gridSize * gridSize) / 1
						)}{" "}
						sqm)
					</span>
				)}
			</div>

			<div className="flex gap-2">
				<button
					onClick={handleClear}
					className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					disabled={selectedCells.length === 0}
				>
					Clear
				</button>
				<button
					onClick={onCancel}
					className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					Cancel
				</button>
				<button
					onClick={handleSave}
					className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
					disabled={selectedCells.length === 0}
				>
					Save
				</button>
			</div>
		</div>
	);
}
