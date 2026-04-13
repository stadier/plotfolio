import { PropertyStatus } from "@/types/property";

// Re-export from canonical source
export { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";

export function getStatusBadge(status: PropertyStatus) {
	switch (status) {
		case PropertyStatus.OWNED:
			return {
				label: "Owned",
				cls: "bg-green-600 text-white dark:bg-green-500/20 dark:text-green-300",
			};
		case PropertyStatus.FOR_SALE:
			return {
				label: "For Sale",
				cls: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300",
			};
		case PropertyStatus.FOR_RENT:
			return {
				label: "For Rent",
				cls: "bg-teal-600 text-white dark:bg-teal-500/20 dark:text-teal-300",
			};
		case PropertyStatus.FOR_LEASE:
			return {
				label: "For Lease",
				cls: "bg-cyan-600 text-white dark:bg-cyan-500/20 dark:text-cyan-300",
			};
		case PropertyStatus.UNDER_CONTRACT:
			return {
				label: "Under Contract",
				cls: "bg-orange-500 text-white dark:bg-orange-500/20 dark:text-orange-300",
			};
		case PropertyStatus.RENTED:
			return {
				label: "Rented",
				cls: "bg-purple-600 text-white dark:bg-purple-500/20 dark:text-purple-300",
			};
		case PropertyStatus.LEASED:
			return {
				label: "Leased",
				cls: "bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-300",
			};
		case PropertyStatus.DEVELOPMENT:
			return {
				label: "Development",
				cls: "bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-300",
			};
		default:
			return {
				label: (status as string).replace(/_/g, " "),
				cls: "bg-slate-500 text-white dark:bg-slate-500/20 dark:text-slate-300",
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
