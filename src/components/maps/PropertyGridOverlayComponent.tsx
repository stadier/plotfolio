"use client";

import { Property } from "@/types/property";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface PropertyGridOverlayProps {
	properties: Property[];
	selectedPropertyId?: string | null;
	showPropertyGrids?: boolean;
}

export default function PropertyGridOverlayComponent({
	properties,
	selectedPropertyId,
	showPropertyGrids = true,
}: PropertyGridOverlayProps) {
	const map = useMap();
	const layerGroupRef = useRef<L.LayerGroup | null>(null);

	useEffect(() => {
		if (!showPropertyGrids) {
			if (layerGroupRef.current) {
				map.removeLayer(layerGroupRef.current);
				layerGroupRef.current = null;
			}
			return;
		}

		// Clear existing layer
		if (layerGroupRef.current) {
			map.removeLayer(layerGroupRef.current);
		}

		layerGroupRef.current = L.layerGroup().addTo(map);

		// Draw property grids
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
				const cellBounds: [number, number][] = [
					[cell.lat, cell.lng],
					[cell.lat + gridLatStep, cell.lng],
					[cell.lat + gridLatStep, cell.lng + gridLngStep],
					[cell.lat, cell.lng + gridLngStep],
				];

				L.polygon(cellBounds, {
					color: isSelected ? "#3B82F6" : grid.color || "#10B981",
					weight: isSelected ? 3 : 2,
					opacity: isSelected ? 1 : 0.7,
					fillColor: isSelected ? "#3B82F6" : grid.color || "#10B981",
					fillOpacity: isSelected ? 0.2 : 0.15,
					interactive: false,
				}).addTo(layerGroupRef.current!);
			});

			// Draw outline around all cells
			if (grid.cells.length > 0) {
				const allPoints: [number, number][] = [];

				// Create a set of all unique boundary points
				const boundaryPoints = new Set<string>();

				grid.cells.forEach((cell) => {
					const points = [
						[cell.lat, cell.lng],
						[cell.lat + gridLatStep, cell.lng],
						[cell.lat + gridLatStep, cell.lng + gridLngStep],
						[cell.lat, cell.lng + gridLngStep],
					];
					points.forEach((p) => boundaryPoints.add(`${p[0]},${p[1]}`));
				});

				// Draw outer boundary
				const center = {
					lat:
						grid.cells.reduce((sum, c) => sum + c.lat, 0) / grid.cells.length +
						gridLatStep / 2,
					lng:
						grid.cells.reduce((sum, c) => sum + c.lng, 0) / grid.cells.length +
						gridLngStep / 2,
				};

				// Draw a marker at the center
				L.circleMarker([center.lat, center.lng], {
					radius: 4,
					color: isSelected ? "#3B82F6" : grid.color || "#10B981",
					fillColor: isSelected ? "#3B82F6" : grid.color || "#10B981",
					fillOpacity: 0.8,
					weight: 2,
				}).addTo(layerGroupRef.current!);
			}
		});

		return () => {
			if (layerGroupRef.current) {
				map.removeLayer(layerGroupRef.current);
			}
		};
	}, [map, properties, selectedPropertyId, showPropertyGrids]);

	return null;
}
