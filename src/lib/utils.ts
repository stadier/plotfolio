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

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function getPropertyTypeColor(type: string): string {
	const colors = {
		residential: "#10B981", // green
		commercial: "#3B82F6", // blue
		industrial: "#8B5CF6", // purple
		agricultural: "#F59E0B", // amber
		vacant_land: "#6B7280", // gray
		mixed_use: "#EF4444", // red
	};

	return colors[type as keyof typeof colors] || "#6B7280";
}

/**
 * Normalise the legacy `images` string array and new `media` array into a
 * single `PropertyMedia[]`.  Media entries take precedence; any legacy image
 * URLs that aren't already present in `media` are appended as IMAGE type.
 */
export function getPropertyMedia(property: Property): PropertyMedia[] {
	const mediaItems: PropertyMedia[] = [...(property.media ?? [])];
	const existingUrls = new Set(mediaItems.map((m) => m.url));

	for (const url of property.images ?? []) {
		if (!existingUrls.has(url)) {
			mediaItems.push({ url, type: MediaType.IMAGE });
			existingUrls.add(url);
		}
	}

	return mediaItems;
}

/** Get only image-type media for contexts that only display images (map popups, etc.) */
export function getPropertyImageUrls(property: Property): string[] {
	return getPropertyMedia(property)
		.filter((m) => m.type === MediaType.IMAGE)
		.map((m) => m.url);
}
