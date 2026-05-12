/**
 * Geocode provider abstraction.
 *
 * Set GEOCODE_PROVIDER in .env.local to one of:
 *   "photon" | "nominatim" | "google" | "googleAutocomplete"
 * For Google, also set GOOGLE_MAPS_API_KEY.
 *
 * - "google": Places Text Search (single-shot lookup, fewer predictions)
 * - "googleAutocomplete": Place Autocomplete + Place Details (typeahead-style,
 *   matches what google.com/maps shows; costs 1 autocomplete + N details calls
 *   per query, where N is the number of returned predictions, capped at 5)
 *
 * Default: "google"
 */

export interface GeocodeResult {
	place_id: number | string;
	display_name: string;
	lat: string;
	lon: string;
}

type GeocodeProvider = (q: string) => Promise<GeocodeResult[]>;
type GeocodeProviderName =
	| "google"
	| "googleAutocomplete"
	| "photon"
	| "nominatim";

const HEADERS = {
	"User-Agent": "Plotfolio/1.0 (property management app)",
	"Accept-Language": "en",
};

// ─── Photon (Komoot) ─────────────────────────────────────────────

interface PhotonFeature {
	properties: {
		osm_id: number;
		name?: string;
		housenumber?: string;
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		postcode?: string;
	};
	geometry: { coordinates: [number, number] };
}

function photonDisplayName(p: PhotonFeature["properties"]): string {
	const parts: string[] = [];
	if (p.name) parts.push(p.name);
	if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
	else if (p.street) parts.push(p.street);
	if (p.city) parts.push(p.city);
	if (p.state) parts.push(p.state);
	if (p.country) parts.push(p.country);
	return parts.join(", ") || "Unknown location";
}

const photon: GeocodeProvider = async (q) => {
	const res = await fetch(
		`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`,
		{ headers: HEADERS },
	);
	if (!res.ok) return [];
	const data: { features: PhotonFeature[] } = await res.json();
	return data.features.map((f) => ({
		place_id: f.properties.osm_id,
		display_name: photonDisplayName(f.properties),
		lat: String(f.geometry.coordinates[1]),
		lon: String(f.geometry.coordinates[0]),
	}));
};

// ─── Nominatim (OpenStreetMap) ───────────────────────────────────

interface NominatimResult {
	place_id: number;
	display_name: string;
	lat: string;
	lon: string;
}

const nominatim: GeocodeProvider = async (q) => {
	const res = await fetch(
		`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
		{ headers: HEADERS },
	);
	if (!res.ok) return [];
	const data: NominatimResult[] = await res.json();
	return data.map((r) => ({
		place_id: r.place_id,
		display_name: r.display_name,
		lat: r.lat,
		lon: r.lon,
	}));
};

// ─── Google Places (Text Search) ─────────────────────────────────

interface GoogleCandidate {
	place_id: string;
	formatted_address: string;
	geometry: { location: { lat: number; lng: number } };
}

const google: GeocodeProvider = async (q) => {
	const key = process.env.GOOGLE_MAPS_API_KEY;
	if (!key) return [];
	const res = await fetch(
		`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`,
	);
	if (!res.ok) return [];
	const data: { results: GoogleCandidate[] } = await res.json();
	return data.results.slice(0, 5).map((r) => ({
		place_id: r.place_id,
		display_name: r.formatted_address,
		lat: String(r.geometry.location.lat),
		lon: String(r.geometry.location.lng),
	}));
};

// ─── Google Place Autocomplete + Details ─────────────────────────

interface GoogleAutocompletePrediction {
	place_id: string;
	description: string;
	structured_formatting?: {
		main_text: string;
		secondary_text?: string;
	};
}

interface GooglePlaceDetailsResult {
	formatted_address?: string;
	name?: string;
	geometry?: { location: { lat: number; lng: number } };
}

async function googlePlaceDetails(
	placeId: string,
	key: string,
): Promise<{ lat: number; lng: number; address: string } | null> {
	const res = await fetch(
		`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
			placeId,
		)}&fields=geometry,formatted_address,name&key=${encodeURIComponent(key)}`,
	);
	if (!res.ok) return null;
	const data: { result?: GooglePlaceDetailsResult } = await res.json();
	const r = data.result;
	if (!r?.geometry) return null;
	return {
		lat: r.geometry.location.lat,
		lng: r.geometry.location.lng,
		address: r.formatted_address || r.name || "",
	};
}

const googleAutocomplete: GeocodeProvider = async (q) => {
	const key = process.env.GOOGLE_MAPS_API_KEY;
	if (!key) return [];
	const res = await fetch(
		`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
			q,
		)}&key=${encodeURIComponent(key)}`,
	);
	if (!res.ok) return [];
	const data: { predictions: GoogleAutocompletePrediction[] } =
		await res.json();
	const predictions = data.predictions.slice(0, 5);

	// Resolve lat/lng for each prediction in parallel via Place Details.
	const detailed: (GeocodeResult | null)[] = await Promise.all(
		predictions.map(async (p) => {
			const details = await googlePlaceDetails(p.place_id, key);
			if (!details) return null;
			return {
				place_id: p.place_id,
				display_name: details.address || p.description,
				lat: String(details.lat),
				lon: String(details.lng),
			} satisfies GeocodeResult;
		}),
	);

	return detailed.filter((r): r is GeocodeResult => r !== null);
};

// ─── Provider map ────────────────────────────────────────────────

const providers: Record<string, GeocodeProvider> = {
	photon,
	nominatim,
	google,
	googleAutocomplete,
};

export function getGeocodeProvider(): GeocodeProvider {
	const name = (process.env.GEOCODE_PROVIDER || "google").toLowerCase();
	// case-insensitive lookup
	const match = Object.keys(providers).find((k) => k.toLowerCase() === name);
	return match ? providers[match] : google;
}

/**
 * Returns a geocode function that tries Google first, then falls back
 * to Photon → Nominatim if Google fails or returns no results.
 *
 * If GEOCODE_PROVIDER=googleAutocomplete, autocomplete is used instead
 * of text search at the head of the chain.
 */
export function getGeocodeWithFallback(): GeocodeProvider {
	const primary =
		(process.env.GEOCODE_PROVIDER || "google").toLowerCase() ===
		"googleautocomplete"
			? googleAutocomplete
			: google;
	return async (q: string) => {
		const chain: GeocodeProvider[] = [primary, photon, nominatim];
		for (const provider of chain) {
			try {
				const results = await provider(q);
				if (results.length > 0) return results;
			} catch {
				// try next provider
			}
		}
		return [];
	};
}

/**
 * Returns geocode results plus the provider that returned them.
 * Helpful for diagnostics and runtime verification.
 */
export async function geocodeWithFallbackAndSource(q: string): Promise<{
	results: GeocodeResult[];
	provider: GeocodeProviderName | "none";
}> {
	const useAutocomplete =
		(process.env.GEOCODE_PROVIDER || "google").toLowerCase() ===
		"googleautocomplete";
	const chain: Array<{ name: GeocodeProviderName; provider: GeocodeProvider }> =
		[
			useAutocomplete
				? { name: "googleAutocomplete", provider: googleAutocomplete }
				: { name: "google", provider: google },
			{ name: "photon", provider: photon },
			{ name: "nominatim", provider: nominatim },
		];

	for (const { name, provider } of chain) {
		try {
			const results = await provider(q);
			if (results.length > 0) {
				return { results, provider: name };
			}
		} catch {
			// try next provider
		}
	}

	return { results: [], provider: "none" };
}

// ─── Reverse Geocoding ──────────────────────────────────────────

export interface ReverseGeocodeResult {
	display_name: string;
	city: string;
	state: string;
	country: string;
	street: string;
}

type ReverseGeocodeProvider = (
	lat: number,
	lon: number,
) => Promise<ReverseGeocodeResult | null>;

const reversePhoton: ReverseGeocodeProvider = async (lat, lon) => {
	const res = await fetch(
		`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
		{ headers: HEADERS },
	);
	if (!res.ok) return null;
	const data: { features: PhotonFeature[] } = await res.json();
	const f = data.features[0];
	if (!f) return null;
	const p = f.properties;
	return {
		display_name: photonDisplayName(p),
		city: p.city || "",
		state: p.state || "",
		country: p.country || "",
		street: [p.housenumber, p.street].filter(Boolean).join(" "),
	};
};

interface NominatimReverseResult {
	display_name: string;
	address: {
		road?: string;
		house_number?: string;
		city?: string;
		town?: string;
		village?: string;
		state?: string;
		country?: string;
	};
}

const reverseNominatim: ReverseGeocodeProvider = async (lat, lon) => {
	const res = await fetch(
		`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
		{ headers: HEADERS },
	);
	if (!res.ok) return null;
	const data: NominatimReverseResult = await res.json();
	const a = data.address;
	return {
		display_name: data.display_name,
		city: a.city || a.town || a.village || "",
		state: a.state || "",
		country: a.country || "",
		street: [a.house_number, a.road].filter(Boolean).join(" "),
	};
};

const reverseGoogle: ReverseGeocodeProvider = async (lat, lon) => {
	const key = process.env.GOOGLE_MAPS_API_KEY;
	if (!key) return null;
	const res = await fetch(
		`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${encodeURIComponent(key)}`,
	);
	if (!res.ok) return null;
	const data: {
		results: {
			formatted_address: string;
			address_components: {
				long_name: string;
				types: string[];
			}[];
		}[];
	} = await res.json();
	const r = data.results[0];
	if (!r) return null;
	const get = (type: string) =>
		r.address_components.find((c) => c.types.includes(type))?.long_name || "";
	return {
		display_name: r.formatted_address,
		city: get("locality") || get("administrative_area_level_2"),
		state: get("administrative_area_level_1"),
		country: get("country"),
		street: [get("street_number"), get("route")].filter(Boolean).join(" "),
	};
};

const reverseProviders: Record<string, ReverseGeocodeProvider> = {
	photon: reversePhoton,
	nominatim: reverseNominatim,
	google: reverseGoogle,
};

export function getReverseGeocodeProvider(): ReverseGeocodeProvider {
	const name = (process.env.GEOCODE_PROVIDER || "google").toLowerCase();
	return reverseProviders[name] || reverseGoogle;
}

/**
 * Returns a reverse geocode function that tries Google first, then falls back
 * to Photon → Nominatim if Google fails or returns null.
 */
export function getReverseGeocodeWithFallback(): ReverseGeocodeProvider {
	return async (lat: number, lon: number) => {
		const chain: ReverseGeocodeProvider[] = [
			reverseGoogle,
			reversePhoton,
			reverseNominatim,
		];
		for (const provider of chain) {
			try {
				const result = await provider(lat, lon);
				if (result) return result;
			} catch {
				// try next provider
			}
		}
		return null;
	};
}
