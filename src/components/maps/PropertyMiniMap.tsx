"use client";

import { getDefaultTile } from "@/lib/mapTiles";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Expand } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Fix default marker icons in Leaflet with Next.js bundling
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

interface PropertyMiniMapProps {
	lat: number;
	lng: number;
	propertyName: string;
	/** Link to the full map view for this property */
	mapHref?: string;
	/** Show the internal location/expand header */
	showHeader?: boolean;
	/** Render without card frame styles */
	frameless?: boolean;
	/** Show coordinate footer */
	showCoordinates?: boolean;
	/** Controlled expanded state */
	expanded?: boolean;
	/** Controlled expanded state callback */
	onExpandedChange?: (expanded: boolean) => void;
	/** Height class when collapsed */
	collapsedHeightClassName?: string;
	/** Height class when expanded */
	expandedHeightClassName?: string;
}

export default function PropertyMiniMap({
	lat,
	lng,
	propertyName,
	mapHref,
	showHeader = true,
	frameless = false,
	showCoordinates = true,
	expanded,
	onExpandedChange,
	collapsedHeightClassName = "h-44",
	expandedHeightClassName = "h-80",
}: PropertyMiniMapProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const leafletMap = useRef<L.Map | null>(null);
	const [internalExpanded, setInternalExpanded] = useState(false);
	const isExpanded = expanded ?? internalExpanded;

	const setExpanded = (next: boolean) => {
		onExpandedChange?.(next);
		if (expanded === undefined) {
			setInternalExpanded(next);
		}
	};

	useEffect(() => {
		if (!mapRef.current) return;

		// If map already exists, just update view
		if (leafletMap.current) {
			leafletMap.current.invalidateSize();
			leafletMap.current.setView([lat, lng], isExpanded ? 16 : 14);
			return;
		}

		const map = L.map(mapRef.current, {
			center: [lat, lng],
			zoom: isExpanded ? 16 : 14,
			zoomControl: false,
			attributionControl: false,
			scrollWheelZoom: isExpanded,
			dragging: isExpanded,
		});

		const tile = getDefaultTile();
		L.tileLayer(tile.url, {
			attribution: tile.attribution,
			maxZoom: tile.maxZoom,
		}).addTo(map);
		L.marker([lat, lng]).addTo(map).bindPopup(propertyName);

		leafletMap.current = map;

		return () => {
			map.remove();
			leafletMap.current = null;
		};
		// Re-create when expanded changes to toggle interactivity
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lat, lng, propertyName, isExpanded]);

	return (
		<div className="w-full">
			<div
				className={
					frameless
						? "w-full overflow-hidden"
						: "bg-card border border-border rounded-xl overflow-hidden"
				}
			>
				{showHeader && (
					<div className="flex items-center justify-between px-5 py-3">
						<h2 className="text-sm font-semibold text-gray-900 dark:text-on-surface uppercase tracking-wide">
							Location
						</h2>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setExpanded(!isExpanded)}
								className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-on-surface-variant hover:text-primary transition-colors"
							>
								<Expand className="w-3.5 h-3.5" />
								{isExpanded ? "Collapse" : "Expand"}
							</button>
							{mapHref && (
								<Link
									href={mapHref}
									className="text-xs text-primary font-semibold hover:underline"
								>
									Full Map
								</Link>
							)}
						</div>
					</div>
				)}
				<div
					ref={mapRef}
					className={`w-full transition-all duration-300 isolate ${isExpanded ? expandedHeightClassName : collapsedHeightClassName}`}
				/>
				{showCoordinates && (
					<div className="px-5 py-2 text-xs text-slate-500 dark:text-on-surface-variant">
						{lat.toFixed(6)}, {lng.toFixed(6)}
					</div>
				)}
			</div>
		</div>
	);
}
