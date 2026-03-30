import { PropertyStatus } from "@/types/property";

export function formatCurrencyCompact(
	amount: number,
	currency = "USD",
	locale = "en-US",
) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		notation: "compact",
		compactDisplay: "short",
	}).format(amount);
}

export function formatCurrencyFull(
	amount: number,
	currency = "USD",
	locale = "en-US",
) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
	}).format(amount);
}

export function getStatusBadge(status: PropertyStatus) {
	switch (status) {
		case PropertyStatus.OWNED:
			return { label: "Owned", cls: "bg-secondary text-white" };
		case PropertyStatus.FOR_SALE:
			return { label: "For Sale", cls: "bg-primary text-white" };
		case PropertyStatus.DEVELOPMENT:
			return { label: "Development", cls: "bg-amber-500 text-white" };
		case PropertyStatus.UNDER_CONTRACT:
			return { label: "Under Contract", cls: "bg-orange-500 text-white" };
		case PropertyStatus.RENTED:
			return { label: "Rented", cls: "bg-purple-600 text-white" };
		default:
			return {
				label: (status as string).replace(/_/g, " "),
				cls: "bg-slate-500 text-white",
			};
	}
}

export const CARD_GRADIENTS = [
	"bg-linear-to-br from-[#000e24] to-[#00234b]",
	"bg-linear-to-br from-[#1a3a2a] to-[#3b6934]",
	"bg-linear-to-br from-[#1a2638] to-[#2c4771]",
	"bg-linear-to-br from-[#17252c] to-[#3a4950]",
	"bg-linear-to-br from-[#2d1b00] to-[#7a3f00]",
	"bg-linear-to-br from-[#2a0a2e] to-[#6b2f7e]",
];
