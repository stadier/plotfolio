"use client";

import { getStatusColor } from "@/components/property/propertyDisplayHelpers";
import { Property, PropertyStatus } from "@/types/property";
import { ArrowLeftRight, Loader2 } from "lucide-react";

interface StatusToggleProps {
	property: Property;
	onToggle: (newStatus: PropertyStatus) => void;
	isPending?: boolean;
}

const TOGGLEABLE: [PropertyStatus, PropertyStatus] = [
	PropertyStatus.OWNED,
	PropertyStatus.FOR_SALE,
];

export default function StatusToggle({
	property,
	onToggle,
	isPending,
}: StatusToggleProps) {
	const canToggle = TOGGLEABLE.includes(property.status);
	const nextStatus =
		property.status === PropertyStatus.OWNED
			? PropertyStatus.FOR_SALE
			: PropertyStatus.OWNED;
	const nextLabel = nextStatus.replace(/_/g, " ").toUpperCase();

	if (!canToggle) {
		return (
			<span
				className={`ml-auto sm:ml-2 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
			>
				{property.status.replace(/_/g, " ").toUpperCase()}
			</span>
		);
	}

	return (
		<button
			type="button"
			disabled={isPending}
			onClick={() => onToggle(nextStatus)}
			title={`Switch to ${nextLabel}`}
			className={`ml-auto sm:ml-2 shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 ${getStatusColor(property.status)}`}
		>
			{isPending ? (
				<Loader2 className="w-3 h-3 animate-spin" />
			) : (
				<ArrowLeftRight className="w-3 h-3" />
			)}
			{property.status.replace(/_/g, " ").toUpperCase()}
		</button>
	);
}
