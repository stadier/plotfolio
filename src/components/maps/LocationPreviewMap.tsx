"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
	._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
	const map = useMap();
	const prev = useRef({ lat, lng });

	useEffect(() => {
		if (prev.current.lat !== lat || prev.current.lng !== lng) {
			map.setView([lat, lng], 14, { animate: true });
			prev.current = { lat, lng };
		}
	}, [map, lat, lng]);

	return null;
}

interface LocationPreviewMapProps {
	lat: number;
	lng: number;
	onClick?: () => void;
}

export default function LocationPreviewMap({
	lat,
	lng,
	onClick,
}: LocationPreviewMapProps) {
	return (
		<div
			onClick={onClick}
			className="relative w-full h-full rounded-lg overflow-hidden cursor-pointer"
		>
			<MapContainer
				center={[lat, lng]}
				zoom={14}
				zoomControl={false}
				attributionControl={false}
				dragging={false}
				scrollWheelZoom={false}
				doubleClickZoom={false}
				touchZoom={false}
				keyboard={false}
				boxZoom={false}
				className="w-full h-full"
				style={{ zIndex: 0 }}
			>
				<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				<Marker position={[lat, lng]} />
				<RecenterMap lat={lat} lng={lng} />
			</MapContainer>
		</div>
	);
}
