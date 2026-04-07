/** Service categories and available providers for each. */

export interface ProviderOption {
	value: string;
	label: string;
	description: string;
	requiresKey?: string; // env var name required
	free?: boolean;
}

export interface ProviderCategory {
	key: keyof ProviderSettings;
	label: string;
	description: string;
	options: ProviderOption[];
}

export interface ProviderSettings {
	mapRenderer: string;
	mapTiles: string;
	geocoding: string;
	ocr: string;
	aiModel: string;
	fileStorage: string;
}

export const PROVIDER_DEFAULTS: ProviderSettings = {
	mapRenderer: "leaflet",
	mapTiles: "google",
	geocoding: "photon",
	ocr: "google_vision",
	aiModel: "openai_gpt4_turbo",
	fileStorage: "backblaze_b2",
};

export const PROVIDER_CATEGORIES: ProviderCategory[] = [
	{
		key: "mapRenderer",
		label: "Map Renderer",
		description:
			"The library used to render interactive maps throughout the app.",
		options: [
			{
				value: "google",
				label: "Google Maps",
				description:
					"Full-featured maps with Street View and 3D. Requires API key.",
				requiresKey: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
			},
			{
				value: "mapbox",
				label: "Mapbox GL",
				description:
					"High-performance vector maps with custom styling. Requires access token.",
				requiresKey: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
			},
			{
				value: "leaflet",
				label: "Leaflet (OpenStreetMap)",
				description: "Lightweight open-source maps. Free, no API key needed.",
				free: true,
			},
		],
	},
	{
		key: "mapTiles",
		label: "Map Tiles",
		description: "The tile imagery source for map backgrounds and layers.",
		options: [
			{
				value: "google",
				label: "Google Maps Tiles",
				description: "High-quality imagery with frequent updates.",
				requiresKey: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
			},
			{
				value: "mapbox",
				label: "Mapbox Tiles",
				description:
					"Customisable vector tiles with multiple styles. Requires access token.",
				requiresKey: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
			},
			{
				value: "osm",
				label: "OpenStreetMap",
				description:
					"Community-maintained tiles. Free, no key needed. Satellite via Esri.",
				free: true,
			},
		],
	},
	{
		key: "geocoding",
		label: "Geocoding & Place Search",
		description:
			"Converts addresses to coordinates and provides place name suggestions.",
		options: [
			{
				value: "photon",
				label: "Photon (Komoot)",
				description:
					"Fast, free geocoder with fuzzy matching. Powered by OpenStreetMap data.",
				free: true,
			},
			{
				value: "nominatim",
				label: "Nominatim (OpenStreetMap)",
				description:
					"Official OSM geocoder. Free with rate limits. Good worldwide coverage.",
				free: true,
			},
			{
				value: "google",
				label: "Google Places",
				description:
					"Premium geocoding with autocomplete and rich place data. Requires API key.",
				requiresKey: "GOOGLE_MAPS_API_KEY",
			},
		],
	},
	{
		key: "ocr",
		label: "OCR (Document Scanning)",
		description:
			"Optical character recognition for reading text from uploaded documents and survey plans.",
		options: [
			{
				value: "google_vision",
				label: "Google Cloud Vision",
				description:
					"High-accuracy document text detection. Requires API key or service account.",
				requiresKey: "GOOGLE_VISION_API_KEY",
			},
			{
				value: "tesseract",
				label: "Tesseract.js",
				description:
					"Open-source OCR running locally in-browser/server. Free, no key needed.",
				free: true,
			},
		],
	},
	{
		key: "aiModel",
		label: "AI Model",
		description:
			"The language model used for document analysis, field extraction, and boundary detection.",
		options: [
			{
				value: "openai_gpt4_turbo",
				label: "OpenAI GPT-4 Turbo",
				description:
					"Most capable model for document understanding and extraction.",
				requiresKey: "OPENAI_API_KEY",
			},
			{
				value: "openai_gpt4o",
				label: "OpenAI GPT-4o",
				description: "Multimodal model with vision. Fast and cost-effective.",
				requiresKey: "OPENAI_API_KEY",
			},
			{
				value: "openai_gpt35_turbo",
				label: "OpenAI GPT-3.5 Turbo",
				description: "Faster and cheaper. Good for simpler extraction tasks.",
				requiresKey: "OPENAI_API_KEY",
			},
		],
	},
	{
		key: "fileStorage",
		label: "File Storage",
		description:
			"Where uploaded documents, images, and property photos are stored.",
		options: [
			{
				value: "backblaze_b2",
				label: "Backblaze B2",
				description: "S3-compatible object storage. Low cost, high durability.",
				requiresKey: "B2_KEY_ID",
			},
			{
				value: "local",
				label: "Local Filesystem",
				description:
					"Store files on the server. No external service needed. Not recommended for production.",
				free: true,
			},
		],
	},
];
