/**
 * Map tile provider abstraction.
 *
 * Set NEXT_PUBLIC_MAP_PROVIDER in .env.local to one of: "osm" | "mapbox" | "google"
 * For Mapbox, also set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
 * For Google, also set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 *
 * Default: "osm" (OpenStreetMap — free, no key needed)
 */

export interface TileLayerConfig {
	url: string;
	attribution: string;
	maxZoom: number;
}

export interface TileLayerWithOverlay extends TileLayerConfig {
	overlay?: TileLayerConfig & { opacity: number };
}

export interface MapTileSet {
	standard: TileLayerConfig;
	satellite: TileLayerWithOverlay;
	terrain: TileLayerConfig;
	hybrid: TileLayerWithOverlay;
}

// ─── OpenStreetMap (free, no key) ────────────────────────────────

const osmTiles: MapTileSet = {
	standard: {
		url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		maxZoom: 19,
	},
	satellite: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution:
			"&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
		maxZoom: 19,
	},
	terrain: {
		url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
		attribution:
			'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
		maxZoom: 17,
	},
	hybrid: {
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution:
			"&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
		maxZoom: 19,
		overlay: {
			url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19,
			opacity: 0.3,
		},
	},
};

// ─── Mapbox (requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) ───────────

function mapboxUrl(style: string): string {
	const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
	return `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`;
}

const MAPBOX_ATTR =
	'&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const mapboxTiles: MapTileSet = {
	standard: {
		url: mapboxUrl("streets-v12"),
		attribution: MAPBOX_ATTR,
		maxZoom: 22,
	},
	satellite: {
		url: mapboxUrl("satellite-v9"),
		attribution: MAPBOX_ATTR,
		maxZoom: 22,
	},
	terrain: {
		url: mapboxUrl("outdoors-v12"),
		attribution: MAPBOX_ATTR,
		maxZoom: 22,
	},
	hybrid: {
		url: mapboxUrl("satellite-streets-v12"),
		attribution: MAPBOX_ATTR,
		maxZoom: 22,
	},
};

// ─── Google Maps (requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ──────

function googleUrl(layer: string): string {
	return `https://mt1.google.com/vt/lyrs=${layer}&x={x}&y={y}&z={z}`;
}

const GOOGLE_ATTR = "&copy; Google Maps";

const googleTiles: MapTileSet = {
	standard: {
		url: googleUrl("m"),
		attribution: GOOGLE_ATTR,
		maxZoom: 22,
	},
	satellite: {
		url: googleUrl("s"),
		attribution: GOOGLE_ATTR,
		maxZoom: 22,
	},
	terrain: {
		url: googleUrl("p"),
		attribution: GOOGLE_ATTR,
		maxZoom: 22,
	},
	hybrid: {
		url: googleUrl("y"),
		attribution: GOOGLE_ATTR,
		maxZoom: 22,
	},
};

// ─── Provider map ────────────────────────────────────────────────

const providers: Record<string, MapTileSet> = {
	osm: osmTiles,
	mapbox: mapboxTiles,
	google: googleTiles,
};

export function getMapTiles(): MapTileSet {
	const name = (process.env.NEXT_PUBLIC_MAP_PROVIDER || "osm").toLowerCase();
	return providers[name] || osmTiles;
}

/** Convenience: get the default (standard) tile layer */
export function getDefaultTile(): TileLayerConfig {
	return getMapTiles().standard;
}
