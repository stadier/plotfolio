"use client";

import NumberInput from "@/components/ui/NumberInput";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { queryKeys } from "@/hooks/usePropertyQueries";
import { PropertyAPI } from "@/lib/api";
import { Property, PropertyStatus, PropertyType } from "@/types/property";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useState } from "react";

interface BulkUnitCreatorProps {
	parent: Property;
	open: boolean;
	onClose: () => void;
}

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
	{ value: PropertyStatus.OWNED, label: "Owned" },
	{ value: PropertyStatus.FOR_SALE, label: "For sale" },
	{ value: PropertyStatus.FOR_RENT, label: "For rent" },
	{ value: PropertyStatus.FOR_LEASE, label: "For lease" },
	{ value: PropertyStatus.DEVELOPMENT, label: "Development" },
];

/**
 * Modal for scaffolding many child units under a container parent
 * (estate / phase / building). Generates each unit from a label
 * template using `{n}` as the running index placeholder.
 */
export default function BulkUnitCreator({
	parent,
	open,
	onClose,
}: BulkUnitCreatorProps) {
	const queryClient = useQueryClient();
	const [labelTemplate, setLabelTemplate] = useState("Unit {n}");
	const [startIndex, setStartIndex] = useState("1");
	const [count, setCount] = useState("10");
	const [pad, setPad] = useState("2");
	const [status, setStatus] = useState<PropertyStatus>(PropertyStatus.OWNED);
	const [listingPrice, setListingPrice] = useState("");
	const [areaPerUnit, setAreaPerUnit] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{
		createdCount: number;
		failedCount: number;
	} | null>(null);

	if (!open) return null;

	const startNum = Math.max(1, parseInt(startIndex, 10) || 1);
	const total = Math.max(0, Math.min(200, parseInt(count, 10) || 0));
	const padLen = Math.max(0, Math.min(6, parseInt(pad, 10) || 0));

	const previewLabels: string[] = [];
	for (let i = 0; i < Math.min(3, total); i++) {
		const n = String(startNum + i).padStart(padLen, "0");
		previewLabels.push(labelTemplate.replace(/\{n\}/g, n));
	}

	const reset = () => {
		setResult(null);
		setError(null);
	};

	const handleSubmit = async () => {
		reset();
		if (total <= 0) {
			setError("Count must be at least 1");
			return;
		}
		if (!labelTemplate.includes("{n}")) {
			setError("Label template must include {n} for the unit number");
			return;
		}

		setSubmitting(true);
		try {
			const properties: Omit<Property, "id">[] = [];
			const priceNum = listingPrice ? Number(listingPrice) : undefined;
			const areaNum = areaPerUnit ? Number(areaPerUnit) : undefined;
			const today = new Date();

			for (let i = 0; i < total; i++) {
				const n = String(startNum + i).padStart(padLen, "0");
				const label = labelTemplate.replace(/\{n\}/g, n);
				const unit: Omit<Property, "id"> = {
					name: `${parent.name} — ${label}`,
					address: parent.address,
					coordinates: { ...parent.coordinates },
					area: areaNum ?? 0,
					propertyType: parent.propertyType ?? PropertyType.LAND,
					purchaseDate: today,
					purchasePrice: 0,
					currency: parent.currency,
					listingPrice: priceNum,
					status,
					owner: parent.owner,
					portfolioId: parent.portfolioId,
					state: parent.state,
					city: parent.city,
					country: parent.country,
					parentPropertyId: parent.id,
					unitLabel: label,
					visibility: parent.visibility,
				};
				properties.push(unit);
			}

			const res = await PropertyAPI.createBulkProperties(properties);
			if (!res) {
				setError("Bulk create failed");
				return;
			}
			setResult({
				createdCount: res.createdCount,
				failedCount: res.errors?.length ?? 0,
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.children(parent.id),
			});
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.all,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create units");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-card rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-3 p-5 border-b border-border">
					<div>
						<h2 className="font-headline font-bold text-on-surface text-lg">
							Bulk create units
						</h2>
						<p className="text-xs text-on-surface-variant mt-1">
							Adds child units under{" "}
							<span className="font-semibold text-on-surface">
								{parent.name}
							</span>
							. Use <code className="font-mono">{"{n}"}</code> in the label
							template for the running number.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md hover:bg-surface-container-high"
						aria-label="Close"
					>
						<X className="w-5 h-5 text-on-surface-variant" />
					</button>
				</header>

				<div className="p-5 space-y-4">
					<Field label="Label template">
						<input
							type="text"
							value={labelTemplate}
							onChange={(e) => setLabelTemplate(e.target.value)}
							placeholder="Block A / Plot {n}"
							className="w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</Field>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md">
						<Field label="Count">
							<input
								type="number"
								min={1}
								max={200}
								value={count}
								onChange={(e) => setCount(e.target.value)}
								className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
							/>
						</Field>
						<Field label="Start #">
							<input
								type="number"
								min={1}
								value={startIndex}
								onChange={(e) => setStartIndex(e.target.value)}
								className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
							/>
						</Field>
						<Field label="Pad digits">
							<input
								type="number"
								min={0}
								max={6}
								value={pad}
								onChange={(e) => setPad(e.target.value)}
								className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
						<Field label="Initial status">
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as PropertyStatus)}
								className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
							>
								{STATUS_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</Field>
						<Field
							label={`Listing price${
								parent.currency ? ` (${parent.currency})` : ""
							}`}
						>
							<NumberInput
								value={listingPrice === "" ? null : Number(listingPrice)}
								onValueChange={(v) =>
									setListingPrice(v == null ? "" : String(v))
								}
								placeholder="optional"
								className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
							/>
						</Field>
					</div>

					<Field label="Area per unit (sqm)">
						<NumberInput
							value={areaPerUnit === "" ? null : Number(areaPerUnit)}
							onValueChange={(v) => setAreaPerUnit(v == null ? "" : String(v))}
							placeholder="optional"
							className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</Field>

					{previewLabels.length > 0 && (
						<div className="rounded-md bg-surface-container p-3 max-w-md">
							<div className="text-badge uppercase tracking-wide font-semibold text-outline mb-1">
								Preview
							</div>
							<ul className="text-sm text-on-surface space-y-0.5">
								{previewLabels.map((l) => (
									<li key={l}>· {l}</li>
								))}
								{total > previewLabels.length && (
									<li className="text-outline">
										… and {total - previewLabels.length} more
									</li>
								)}
							</ul>
						</div>
					)}

					{error && (
						<div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
							{error}
						</div>
					)}

					{result && (
						<div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm">
							Created {result.createdCount} unit
							{result.createdCount === 1 ? "" : "s"}
							{result.failedCount > 0 && ` · ${result.failedCount} failed`}
						</div>
					)}
				</div>

				<footer className="flex items-center justify-end gap-2 p-5 border-t border-border">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-md text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
					>
						{result ? "Close" : "Cancel"}
					</button>
					{!result && (
						<PrimaryButton onClick={handleSubmit} disabled={submitting}>
							{submitting && <Loader2 className="w-4 h-4 animate-spin" />}
							{submitting
								? "Creating…"
								: `Create ${total} unit${total === 1 ? "" : "s"}`}
						</PrimaryButton>
					)}
				</footer>
			</div>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<label className="block">
			<span className="block text-badge uppercase tracking-wide font-semibold text-on-surface-variant mb-1">
				{label}
			</span>
			{children}
		</label>
	);
}
