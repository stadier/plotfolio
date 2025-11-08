"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

interface AdministrativeBoundariesProps {
	showBorders?: boolean;
	onRegionHover?: (regionName: string | null) => void;
	onRegionClick?: (regionName: string) => void;
}

export default function AdministrativeBoundaries({
	showBorders = true,
	onRegionHover,
	onRegionClick,
}: AdministrativeBoundariesProps) {
	const map = useMap();
	const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

	useEffect(() => {
		if (!map) return;

		// Enhanced styling for Nigerian state boundaries
		const styles = showBorders
			? [
					// State/Province boundaries (Nigerian states) - Make these VERY prominent
					{
						featureType: "administrative.province",
						stylers: [
							{ visibility: "on" },
							{ weight: 3 },
							{ color: "#2563EB" }, // Blue color for better visibility
							{ gamma: 1.2 },
						],
					},
					// Administrative area level 1 boundaries (states)
					{
						featureType: "administrative",
						elementType: "geometry.stroke",
						stylers: [
							{ visibility: "on" },
							{ weight: 2.5 },
							{ color: "#3B82F6" }, // Bright blue
						],
					},
					// Enhanced administrative boundaries for better state visibility
					{
						featureType: "administrative.administrative_area_level_1",
						elementType: "geometry.stroke",
						stylers: [
							{ visibility: "on" },
							{ weight: 3 },
							{ color: "#1D4ED8" }, // Strong blue
						],
					},
					// Local government areas within states (lighter)
					{
						featureType: "administrative.locality",
						stylers: [
							{ visibility: "on" },
							{ weight: 1 },
							{ color: "#94A3B8" },
						],
					},
					// Country boundaries (thicker for distinction)
					{
						featureType: "administrative.country",
						stylers: [
							{ visibility: "on" },
							{ weight: 4 },
							{ color: "#1F2937" },
						],
					},
					// Administrative land parcel boundaries
					{
						featureType: "administrative.land_parcel",
						stylers: [
							{ visibility: "on" },
							{ weight: 1 },
							{ color: "#CBD5E1" },
						],
					},
			  ]
			: [
					{
						featureType: "administrative.province",
						stylers: [{ visibility: "off" }],
					},
					{
						featureType: "administrative.locality",
						stylers: [{ visibility: "off" }],
					},
					{
						featureType: "administrative",
						elementType: "geometry.stroke",
						stylers: [{ visibility: "off" }],
					},
					{
						featureType: "administrative.administrative_area_level_1",
						elementType: "geometry.stroke",
						stylers: [{ visibility: "off" }],
					},
					{
						featureType: "administrative.land_parcel",
						stylers: [{ visibility: "off" }],
					},
			  ];

		map.setOptions({ styles });

		// Add click listener for administrative areas
		const clickListener = map.addListener(
			"click",
			(event: google.maps.MapMouseEvent) => {
				if (!event.latLng || !showBorders) return;

				// Use Geocoding service to get administrative area info
				const geocoder = new google.maps.Geocoder();
				geocoder.geocode({ location: event.latLng }, (results, status) => {
					if (status === "OK" && results && results[0]) {
						// Find administrative area level 1 (state/province)
						const addressComponents = results[0].address_components;
						const stateComponent = addressComponents.find((component) =>
							component.types.includes("administrative_area_level_1")
						);

						if (stateComponent && onRegionClick) {
							onRegionClick(stateComponent.long_name);
						}
					}
				});
			}
		);

		// Add mousemove listener for hover effects
		let hoverTimeout: NodeJS.Timeout;
		const mouseMoveListener = map.addListener(
			"mousemove",
			(event: google.maps.MapMouseEvent) => {
				if (!event.latLng || !showBorders) return;

				// Debounce the geocoding requests
				clearTimeout(hoverTimeout);
				hoverTimeout = setTimeout(() => {
					const geocoder = new google.maps.Geocoder();
					geocoder.geocode({ location: event.latLng }, (results, status) => {
						if (status === "OK" && results && results[0]) {
							const addressComponents = results[0].address_components;
							const stateComponent = addressComponents.find((component) =>
								component.types.includes("administrative_area_level_1")
							);

							if (stateComponent) {
								const stateName = stateComponent.long_name;
								if (hoveredRegion !== stateName) {
									setHoveredRegion(stateName);
									if (onRegionHover) {
										onRegionHover(stateName);
									}
								}
							}
						}
					});
				}, 200); // 200ms debounce
			}
		);

		return () => {
			clickListener.remove();
			mouseMoveListener.remove();
			clearTimeout(hoverTimeout);
			// Reset map styles when component unmounts
			map.setOptions({ styles: [] });
		};
	}, [map, showBorders, hoveredRegion, onRegionHover, onRegionClick]);

	return null;
}
