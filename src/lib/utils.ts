import { getCurrencyForCountry, getLocaleForCountry } from "@/lib/locale";
import { MediaType, type Property, type PropertyMedia } from "@/types/property";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format an amount as currency.
 * Pass `country` (e.g. "Nigeria") to auto-resolve the correct currency & locale.
 * Explicit `currency` / `locale` overrides still work as before.
 */
export function formatCurrency(
	amount: number,
	country?: string,
	currency?: string,
	locale?: string,
): string {
	const resolvedCurrency = currency ?? getCurrencyForCountry(country);
	const resolvedLocale = locale ?? getLocaleForCountry(country);
	return new Intl.NumberFormat(resolvedLocale, {
		style: "currency",
		currency: resolvedCurrency,
	}).format(amount);
}

/** Compact notation (e.g. "$1.2M" / "₦450M"). */
export function formatCurrencyCompact(
	amount: number,
	country?: string,
	currency?: string,
	locale?: string,
): string {
	const resolvedCurrency = currency ?? getCurrencyForCountry(country);
	const resolvedLocale = locale ?? getLocaleForCountry(country);
	return new Intl.NumberFormat(resolvedLocale, {
		style: "currency",
		currency: resolvedCurrency,
		minimumFractionDigits: 0,
		notation: "compact",
		compactDisplay: "short",
	}).format(amount);
}

/** Full number, no decimals (e.g. "$1,200,000" / "₦450,000,000"). */
export function formatCurrencyFull(
	amount: number,
	country?: string,
	currency?: string,
	locale?: string,
): string {
	const resolvedCurrency = currency ?? getCurrencyForCountry(country);
	const resolvedLocale = locale ?? getLocaleForCountry(country);
	return new Intl.NumberFormat(resolvedLocale, {
		style: "currency",
		currency: resolvedCurrency,
		minimumFractionDigits: 0,
	}).format(amount);
}

export function formatArea(
	area: number,
	unit: "sqm" | "acres" = "sqm",
): string {
	if (unit === "acres") {
		return `${area.toLocaleString()} acres`;
	}
	return `${area.toLocaleString()} sqm`;
}

/**
 * Compact number (e.g. 1234567 → "1.2M", 2_500_000_000 → "2.5B").
 * Numbers below 1,000 are returned as-is. Numbers below 10,000 keep grouping commas.
 */
export function formatNumberCompact(value: number, fractionDigits = 1): string {
	if (!Number.isFinite(value)) return String(value);
	const abs = Math.abs(value);
	if (abs < 1000) {
		return new Intl.NumberFormat("en-US").format(value);
	}
	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		compactDisplay: "short",
		maximumFractionDigits: fractionDigits,
	}).format(value);
}

/** Full number with thousands separators (e.g. 1234567 → "1,234,567"). */
export function formatNumberFull(value: number): string {
	if (!Number.isFinite(value)) return String(value);
	return new Intl.NumberFormat("en-US").format(value);
}

/** Compact area string ("1.2M sqm") with optional unit. */
export function formatAreaCompact(
	area: number,
	unit: "sqm" | "acres" = "sqm",
): string {
	return `${formatNumberCompact(area)} ${unit}`;
}

/** Full area string with thousands separators ("1,234,567 sqm"). */
export function formatAreaFull(
	area: number,
	unit: "sqm" | "acres" = "sqm",
): string {
	return `${formatNumberFull(area)} ${unit}`;
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function getPropertyTypeColor(type: string): string {
	const colors = {
		land: "#6B7280", // gray
		house: "#10B981", // green
		apartment: "#3B82F6", // blue
		building: "#8B5CF6", // purple
		office: "#0EA5E9", // sky
		retail: "#F59E0B", // amber
		warehouse: "#EF4444", // red
		farm: "#84CC16", // lime
		other: "#94A3B8", // slate
	};

	return colors[type as keyof typeof colors] || "#94A3B8";
}

/**
 * Normalise the legacy `images` string array and new `media` array into a
 * single `PropertyMedia[]`.  Media entries take precedence; any legacy image
 * URLs that aren't already present in `media` are appended as IMAGE type.
 *
 * B2 files are private; all B2 URLs are rewritten to go through the
 * /api/media/view proxy so browsers can load them without credentials.
 */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?)(\?|$)/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|aac|flac|m4a)(\?|$)/i;
const B2_HOSTNAME_RE = /\.backblazeb2\.com($|\/)/i;

/** Rewrite a B2 private URL to our internal path-based proxy route. */
function toProxyUrl(url: string): string {
	if (B2_HOSTNAME_RE.test(url)) {
		try {
			const parsed = new URL(url);
			// Strip leading slash to get the B2 object key
			const key = decodeURIComponent(parsed.pathname.slice(1));
			return `/api/media/view/${key}`;
		} catch {
			// Malformed URL — return as-is and let the browser 404
		}
	}
	return url;
}

function mediaTypeFromUrl(url: string): MediaType {
	if (VIDEO_EXTENSIONS.test(url)) return MediaType.VIDEO;
	if (AUDIO_EXTENSIONS.test(url)) return MediaType.AUDIO;
	return MediaType.IMAGE;
}

export function getPropertyMedia(property: Property): PropertyMedia[] {
	const rawItems: PropertyMedia[] = [...(property.media ?? [])];
	const existingUrls = new Set(rawItems.map((m) => m.url));

	for (const url of property.images ?? []) {
		if (!existingUrls.has(url)) {
			rawItems.push({ url, type: MediaType.IMAGE });
			existingUrls.add(url);
		}
	}

	// Fallback: pick up image/video/audio files that were historically uploaded
	// via the documents upload before the media/documents split. Documents
	// are now hydrated server-side from the unified DocumentModel collection.
	for (const doc of property.documents ?? []) {
		if (!doc.url || existingUrls.has(doc.url)) continue;
		const ext = doc.url;
		if (
			IMAGE_EXTENSIONS.test(ext) ||
			VIDEO_EXTENSIONS.test(ext) ||
			AUDIO_EXTENSIONS.test(ext)
		) {
			rawItems.push({
				url: doc.url,
				type: mediaTypeFromUrl(doc.url),
				caption: doc.name,
			});
			existingUrls.add(doc.url);
		}
	}

	// Rewrite all B2 private URLs to go through the internal proxy
	return rawItems.map((item) => ({
		...item,
		url: toProxyUrl(item.url),
		...(item.thumbnail ? { thumbnail: toProxyUrl(item.thumbnail) } : {}),
	}));
}

/** Get only image-type media for contexts that only display images (map popups, etc.) */
export function getPropertyImageUrls(property: Property): string[] {
	return getPropertyMedia(property)
		.filter((m) => m.type === MediaType.IMAGE)
		.map((m) => m.url);
}
