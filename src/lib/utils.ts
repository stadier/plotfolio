import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
	}).format(amount);
}

export function formatArea(
	area: number,
	unit: "sqm" | "acres" = "sqm"
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

export function calculateDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 3959; // Earth's radius in miles
	const dLat = toRadians(lat2 - lat1);
	const dLng = toRadians(lng2 - lng1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) *
			Math.cos(toRadians(lat2)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export function generatePropertyId(): string {
	return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}
