"use client";

import { GridCell, PropertyGrid } from "@/types/property";
import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

interface GoogleMapsGridSelectorProps {
	propertyId: string;
	propertyCenter: { lat: number; lng: number };
	existingGrid?: PropertyGrid;
	gridSize?: number;
	onGridComplete: (grid: PropertyGrid) => void;
	onCancel: () => void;
}

export default function GoogleMapsGridSelector({
	propertyId,
	propertyCenter,
	existingGrid,
	gridSize = 30,
	onGridComplete,
	onCancel,
}: GoogleMapsGridSelectorProps) {
	const map = useMap();
	const [selectedCells, setSelectedCells] = useState<GridCell[]>(
		existingGrid?.cells || []
	);
	const polygonsRef = useRef<google.maps.Polygon[]>([]);

	// Convert meters to degrees (approximate)
	const latDegPerMeter = 1 / 111000;
	const lngDegPerMeter =
		1 / (111000 * Math.cos((propertyCenter.lat * Math.PI) / 180));
	const gridLatStep = gridSize * latDegPerMeter;
	const gridLngStep = gridSize * lngDegPerMeter;

	// Get grid cell coordinates from a lat/lng point
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

	useEffect(() => {
		if (!map) return;

		// Clear existing polygons
		polygonsRef.current.forEach((polygon) => polygon.setMap(null));
		polygonsRef.current = [];

		const bounds = map.getBounds();
		if (!bounds) return;

		const ne = bounds.getNorthEast();
		const sw = bounds.getSouthWest();

		// Create grid around property center
		const cellsToRender: GridCell[] = [];

		for (let lat = sw.lat(); lat <= ne.lat(); lat += gridLatStep) {
			for (let lng = sw.lng(); lng <= ne.lng(); lng += gridLngStep) {
				const cell = getGridCell(lat, lng);
				cellsToRender.push(cell);
			}
		}

		// Render grid cells
		cellsToRender.forEach((cell) => {
			const isSelected = isCellSelected(cell);

			const polygon = new google.maps.Polygon({
				paths: [
					{ lat: cell.lat, lng: cell.lng },
					{ lat: cell.lat + gridLatStep, lng: cell.lng },
					{ lat: cell.lat + gridLatStep, lng: cell.lng + gridLngStep },
					{ lat: cell.lat, lng: cell.lng + gridLngStep },
				],
				strokeColor: isSelected ? "#10B981" : "#3B82F6",
				strokeOpacity: isSelected ? 0.8 : 0.5,
				strokeWeight: isSelected ? 3 : 2,
				fillColor: isSelected ? "#10B981" : "#3B82F6",
				fillOpacity: isSelected ? 0.3 : 0.05,
				clickable: true,
				map,
			});

			// Add click listener
			polygon.addListener("click", () => {
				if (isSelected) {
					// Remove cell
					setSelectedCells((prev) =>
						prev.filter(
							(c) =>
								Math.abs(c.lat - cell.lat) >= 0.00001 ||
								Math.abs(c.lng - cell.lng) >= 0.00001
						)
					);
				} else {
					// Add cell
					setSelectedCells((prev) => [...prev, cell]);
				}
			});

			polygonsRef.current.push(polygon);
		});

		return () => {
			polygonsRef.current.forEach((polygon) => polygon.setMap(null));
			polygonsRef.current = [];
		};
	}, [map, selectedCells, gridLatStep, gridLngStep]);

	const handleDone = () => {
		const grid: PropertyGrid = {
			cells: selectedCells,
			gridSize,
			color: "#10B981",
		};
		onGridComplete(grid);
	};

	return (
		<div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-sm">
			<h3 className="font-bold text-lg mb-2">Select Property Grid</h3>
			<p className="text-sm text-gray-600 mb-3">
				Click on grid cells to mark your property boundaries
			</p>
			<div className="mb-4">
				<p className="text-sm">
					<span className="font-semibold">Selected cells:</span>{" "}
					{selectedCells.length}
				</p>
				{selectedCells.length > 0 && (
					<p className="text-xs text-gray-500">
						Area: ~
						{(selectedCells.length * gridSize * gridSize).toLocaleString()} m²
					</p>
				)}
			</div>
			<div className="flex gap-2">
				<button
					onClick={handleDone}
					disabled={selectedCells.length === 0}
					className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
				>
					Done
				</button>
				<button
					onClick={onCancel}
					className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
