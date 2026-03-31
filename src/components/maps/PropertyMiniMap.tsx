"use client";

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
}

export default function PropertyMiniMap({
	lat,
	lng,
	propertyName,
	mapHref,
}: PropertyMiniMapProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const leafletMap = useRef<L.Map | null>(null);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		if (!mapRef.current) return;

		// If map already exists, just update view
		if (leafletMap.current) {
			leafletMap.current.invalidateSize();
			leafletMap.current.setView([lat, lng], expanded ? 16 : 14);
			return;
		}

		const map = L.map(mapRef.current, {
			center: [lat, lng],
			zoom: expanded ? 16 : 14,
			zoomControl: false,
			attributionControl: false,
			scrollWheelZoom: expanded,
			dragging: expanded,
		});

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
			map,
		);
		L.marker([lat, lng]).addTo(map).bindPopup(propertyName);

		leafletMap.current = map;

		return () => {
			map.remove();
			leafletMap.current = null;
		};
		// Re-create when expanded changes to toggle interactivity
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lat, lng, propertyName, expanded]);

	return (
		<div className="w-full max-w-xl">
			<div className="bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant rounded-xl overflow-hidden">
				<div className="flex items-center justify-between px-5 py-3">
					<h2 className="text-sm font-semibold text-gray-900 dark:text-on-surface uppercase tracking-wide">
						Location
					</h2>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setExpanded((prev) => !prev)}
							className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-on-surface-variant hover:text-primary transition-colors"
						>
							<Expand className="w-3.5 h-3.5" />
							{expanded ? "Collapse" : "Expand"}
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
				<div
					ref={mapRef}
					className={`w-full transition-all duration-300 ${expanded ? "h-80" : "h-44"}`}
				/>
				<div className="px-5 py-2 text-xs text-slate-500 dark:text-on-surface-variant">
					{lat.toFixed(6)}, {lng.toFixed(6)}
				</div>
			</div>
		</div>
	);
}
