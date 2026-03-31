"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	MapContainer,
	Marker,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";

// Fix for default markers in Leaflet with Next.js
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

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface MapLocationPickerProps {
	initialLat?: number;
	initialLng?: number;
	onConfirm: (lat: number, lng: number) => void;
	onClose: () => void;
}

/** Inner component that listens for map click events */
function ClickHandler({
	onLocationSelect,
}: {
	onLocationSelect: (lat: number, lng: number) => void;
}) {
	useMapEvents({
		click(e) {
			onLocationSelect(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

/** Flies the map to a given coordinate when it changes */
function FlyToHandler({ target }: { target: [number, number] | null }) {
	const map = useMap();
	useEffect(() => {
		if (target) {
			map.flyTo(target, 17, { duration: 1.2 });
		}
	}, [map, target]);
	return null;
}

/** Google Places Autocomplete search input */
function PlacesSearch({
	onPlaceSelect,
}: {
	onPlaceSelect: (lat: number, lng: number, address: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
	const [loaded, setLoaded] = useState(
		typeof google !== "undefined" && !!google.maps?.places,
	);

	// Load Google Maps Places library if not already present
	useEffect(() => {
		if (!GOOGLE_MAPS_API_KEY) return;
		if (typeof google !== "undefined" && google.maps?.places) {
			setLoaded(true);
			return;
		}

		const existing = document.querySelector(
			'script[src*="maps.googleapis.com/maps/api/js"]',
		);
		if (existing) {
			existing.addEventListener("load", () => setLoaded(true));
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.onload = () => setLoaded(true);
		document.head.appendChild(script);
	}, []);

	// Initialize autocomplete once the library is ready
	useEffect(() => {
		if (!loaded || !inputRef.current || autocompleteRef.current) return;

		const ac = new google.maps.places.Autocomplete(inputRef.current, {
			types: ["geocode", "establishment"],
			fields: ["geometry", "formatted_address"],
		});

		ac.addListener("place_changed", () => {
			const place = ac.getPlace();
			if (place.geometry?.location) {
				const lat = place.geometry.location.lat();
				const lng = place.geometry.location.lng();
				onPlaceSelect(lat, lng, place.formatted_address || "");
			}
		});

		autocompleteRef.current = ac;
	}, [loaded, onPlaceSelect]);

	if (!GOOGLE_MAPS_API_KEY) return null;

	return (
		<div className="relative">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-on-surface-variant pointer-events-none" />
			<input
				ref={inputRef}
				type="text"
				placeholder="Search address..."
				className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border rounded-lg text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
			/>
		</div>
	);
}

export default function MapLocationPicker({
	initialLat,
	initialLng,
	onConfirm,
	onClose,
}: MapLocationPickerProps) {
	const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
		initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
	);
	const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

	const center: [number, number] = [initialLat || 20, initialLng || 0];

	const handleLocationSelect = useCallback((lat: number, lng: number) => {
		setSelected({ lat, lng });
	}, []);

	const handlePlaceSelect = useCallback(
		(lat: number, lng: number) => {
			handleLocationSelect(lat, lng);
			setFlyTarget([lat, lng]);
		},
		[handleLocationSelect],
	);

	return (
		<div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div
				className="relative bg-card rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full mx-4 flex flex-col"
				style={{ maxHeight: "90vh" }}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3 border-b border-border">
					<div className="flex items-center gap-2">
						<MapPin className="w-4 h-4 text-primary" />
						<h3 className="font-headline text-sm font-bold text-primary uppercase tracking-wider">
							Pick Location
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-container transition-colors"
					>
						<X className="w-4 h-4 text-slate-500 dark:text-on-surface-variant" />
					</button>
				</div>

				{/* Search bar */}
				<div className="px-5 py-3 border-b border-border">
					<PlacesSearch onPlaceSelect={handlePlaceSelect} />
				</div>

				{/* Map */}
				<div className="h-[60vh]">
					<MapContainer
						center={center}
						zoom={initialLat && initialLng ? 15 : 3}
						className="h-full w-full"
						style={{ height: "100%", width: "100%" }}
					>
						<TileLayer
							attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						/>
						<ClickHandler onLocationSelect={handleLocationSelect} />
						<FlyToHandler target={flyTarget} />
						{selected && <Marker position={[selected.lat, selected.lng]} />}
					</MapContainer>
				</div>

				{/* Footer */}
				<div className="px-5 py-3 border-t border-border flex items-center justify-between">
					<div className="text-xs text-slate-500 dark:text-on-surface-variant font-body">
						{selected ? (
							<span>
								{selected.lat.toFixed(6)}°N, {selected.lng.toFixed(6)}°E
							</span>
						) : (
							<span>Tap on the map to select a location</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-on-surface-variant hover:bg-slate-50 dark:hover:bg-surface-container-high transition-colors font-label"
						>
							Cancel
						</button>
						<button
							type="button"
							disabled={!selected}
							onClick={() => selected && onConfirm(selected.lat, selected.lng)}
							className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-5 py-2 rounded-lg shadow-md active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
						>
							Confirm
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
