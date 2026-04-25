"use client";

import { getStatusColor } from "@/components/property/propertyDisplayHelpers";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Property, PropertyStatus } from "@/types/property";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

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
	const [confirmOpen, setConfirmOpen] = useState(false);
	const canToggle = TOGGLEABLE.includes(property.status);
	const nextStatus =
		property.status === PropertyStatus.OWNED
			? PropertyStatus.FOR_SALE
			: PropertyStatus.OWNED;
	const currentLabel = property.status.replace(/_/g, " ").toUpperCase();
	const nextLabel = nextStatus.replace(/_/g, " ").toUpperCase();
	const consequenceText = useMemo(() => {
		if (nextStatus === PropertyStatus.FOR_SALE) {
			return "This property will be listed for sale. Buyers can discover it and start making offers or bids.";
		}

		return "This property will no longer be listed for sale. New offers and bids will stop, and the listing will switch back to owned.";
	}, [nextStatus]);

	if (!canToggle) {
		return (
			<span
				className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
			>
				{currentLabel}
			</span>
		);
	}

	return (
		<>
			<button
				type="button"
				disabled={isPending}
				onClick={() => setConfirmOpen(true)}
				title={`Switch to ${nextLabel}`}
				className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 ${getStatusColor(property.status)}`}
			>
				{isPending ? (
					<Loader2 className="w-3 h-3 animate-spin" />
				) : (
					<ArrowLeftRight className="w-3 h-3" />
				)}
				{currentLabel}
			</button>

			{confirmOpen && (
				<div
					className="fixed inset-0 z-70 bg-black/45 p-4 sm:p-6 flex items-center justify-center"
					onClick={() => setConfirmOpen(false)}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="status-toggle-confirmation-title"
						className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-5 sm:p-6"
						onClick={(e) => e.stopPropagation()}
					>
						<h3
							id="status-toggle-confirmation-title"
							className="text-base sm:text-lg font-semibold text-on-surface font-headline"
						>
							Confirm status change
						</h3>
						<p className="mt-2 text-sm text-on-surface-variant">
							You are changing this property from
							<span className="font-semibold text-on-surface">
								{" "}
								{currentLabel}
							</span>
							to
							<span className="font-semibold text-on-surface">
								{" "}
								{nextLabel}
							</span>
							.
						</p>
						<p className="mt-2 text-sm text-on-surface-variant">
							{consequenceText}
						</p>

						<div className="mt-5 flex flex-wrap items-center gap-2 justify-end">
							<button
								type="button"
								onClick={() => setConfirmOpen(false)}
								className="px-3 py-2 rounded-md border border-border text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
							>
								Cancel
							</button>
							<PrimaryButton
								type="button"
								disabled={isPending}
								onClick={() => {
									onToggle(nextStatus);
									setConfirmOpen(false);
								}}
								className="px-4 py-2"
							>
								Confirm change
							</PrimaryButton>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
