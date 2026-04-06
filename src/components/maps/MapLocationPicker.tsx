"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
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

interface NominatimResult {
	place_id: number;
	display_name: string;
	lat: string;
	lon: string;
}

export interface PickedLocationAddress {
	city: string;
	state: string;
	country: string;
	street: string;
	display_name: string;
}

interface MapLocationPickerProps {
	initialLat?: number;
	initialLng?: number;
	initialQuery?: string;
	onConfirm: (
		lat: number,
		lng: number,
		address?: PickedLocationAddress,
	) => void;
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

/** Requests geolocation on mount and flies to the user's position */
function GeolocationHandler({
	onLocated,
	hasInitial,
}: {
	onLocated: (lat: number, lng: number) => void;
	hasInitial: boolean;
}) {
	const map = useMap();
	const requested = useRef(false);

	useEffect(() => {
		if (requested.current || hasInitial) return;
		requested.current = true;

		if (!navigator.geolocation) return;

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const { latitude, longitude } = pos.coords;
				map.flyTo([latitude, longitude], 15, { duration: 1.2 });
				onLocated(latitude, longitude);
			},
			() => {
				// Permission denied or error — stay on default view
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	}, [map, onLocated, hasInitial]);

	return null;
}

/** Address search with Nominatim autocomplete */
function AddressSearch({
	onPlaceSelect,
	initialQuery = "",
}: {
	onPlaceSelect: (lat: number, lng: number, address: string) => void;
	initialQuery?: string;
}) {
	const [query, setQuery] = useState(initialQuery);
	const [results, setResults] = useState<NominatimResult[]>([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const abortRef = useRef<AbortController | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const doSearch = useCallback(async (q: string) => {
		// Cancel any in-flight request
		if (abortRef.current) abortRef.current.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		try {
			const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
				signal: controller.signal,
			});
			if (!res.ok) throw new Error("Search failed");
			const data: NominatimResult[] = await res.json();
			setResults(data);
			setOpen(data.length > 0);
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			setResults([]);
			setOpen(false);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleInputChange = useCallback(
		(value: string) => {
			setQuery(value);

			if (debounceRef.current) clearTimeout(debounceRef.current);

			if (value.trim().length < 3) {
				setResults([]);
				setOpen(false);
				setLoading(false);
				return;
			}

			debounceRef.current = setTimeout(() => {
				doSearch(value.trim());
			}, 400);
		},
		[doSearch],
	);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleSelect = (result: NominatimResult) => {
		const lat = parseFloat(result.lat);
		const lng = parseFloat(result.lon);
		setQuery(result.display_name);
		setOpen(false);
		onPlaceSelect(lat, lng, result.display_name);
	};

	return (
		<div ref={containerRef} className="relative">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
			{loading && (
				<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline animate-spin" />
			)}
			<input
				type="text"
				value={query}
				onChange={(e) => handleInputChange(e.target.value)}
				onFocus={() => results.length > 0 && setOpen(true)}
				placeholder="Search for an address or place..."
				className="w-full pl-9 pr-9 py-2.5 text-sm bg-card border border-border rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
			/>
			{open && (
				<ul className="absolute z-[10000] mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
					{results.map((r) => (
						<li key={r.place_id}>
							<button
								type="button"
								className="w-full text-left px-3 py-2.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
								onClick={() => handleSelect(r)}
							>
								{r.display_name}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export default function MapLocationPicker({
	initialLat,
	initialLng,
	initialQuery,
	onConfirm,
	onClose,
}: MapLocationPickerProps) {
	const hasInitial = !!(initialLat && initialLng);
	const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
		hasInitial ? { lat: initialLat!, lng: initialLng! } : null,
	);
	const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
	const [geoCenter, setGeoCenter] = useState<[number, number] | null>(null);
	const [confirming, setConfirming] = useState(false);

	const center: [number, number] = hasInitial
		? [initialLat!, initialLng!]
		: [20, 0];

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

	const handleGeoLocated = useCallback((lat: number, lng: number) => {
		setGeoCenter([lat, lng]);
	}, []);

	const handleRecenter = useCallback(() => {
		if (geoCenter) {
			setFlyTarget([...geoCenter]);
		} else if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const { latitude, longitude } = pos.coords;
					setGeoCenter([latitude, longitude]);
					setFlyTarget([latitude, longitude]);
				},
				() => {},
				{ enableHighAccuracy: true, timeout: 8000 },
			);
		}
	}, [geoCenter]);

	const handleConfirm = useCallback(async () => {
		if (!selected) return;
		setConfirming(true);
		try {
			const res = await fetch(
				`/api/geocode/reverse?lat=${selected.lat}&lon=${selected.lng}`,
			);
			const address = res.ok ? await res.json() : null;
			onConfirm(selected.lat, selected.lng, address ?? undefined);
		} catch {
			onConfirm(selected.lat, selected.lng);
		} finally {
			setConfirming(false);
		}
	}, [selected, onConfirm]);

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
						className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
					>
						<X className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>

				{/* Search bar */}
				<div className="px-5 py-3 border-b border-border">
					<AddressSearch
						onPlaceSelect={handlePlaceSelect}
						initialQuery={initialQuery}
					/>
				</div>

				{/* Map */}
				<div className="relative h-[60vh]">
					<MapContainer
						center={center}
						zoom={hasInitial ? 15 : 3}
						className="h-full w-full"
						style={{ height: "100%", width: "100%" }}
					>
						<TileLayer
							attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						/>
						<ClickHandler onLocationSelect={handleLocationSelect} />
						<FlyToHandler target={flyTarget} />
						<GeolocationHandler
							onLocated={handleGeoLocated}
							hasInitial={hasInitial}
						/>
						{selected && <Marker position={[selected.lat, selected.lng]} />}
					</MapContainer>

					{/* My Location button */}
					<button
						type="button"
						onClick={handleRecenter}
						title="Go to my location"
						className="absolute bottom-4 right-4 z-1000 bg-card border border-border rounded-full p-2.5 shadow-lg hover:bg-surface-container-high transition-colors"
					>
						<LocateFixed className="w-5 h-5 text-primary" />
					</button>
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
							disabled={!selected || confirming}
							onClick={handleConfirm}
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
