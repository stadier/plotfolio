"use client";

import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { cachedGetJSON } from "@/lib/clientCache";
import { Property } from "@/types/property";
import { Maximize2, Pencil, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import PropertyFullView from "./PropertyFullView";
import { getStatusColor } from "./propertyDisplayHelpers";

interface PropertyDrawerProps {
	propertyId: string | null;
	onClose: () => void;
	onChange?: (property: Property) => void;
	sharedFrom?: string | null;
	canEdit?: boolean;
}

export default function PropertyDrawer({
	propertyId,
	onClose,
	onChange,
	sharedFrom,
	canEdit = true,
}: PropertyDrawerProps) {
	const [property, setProperty] = useState<Property | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);
	const propertyCacheRef = useRef<Record<string, Property>>({});
	const { format: formatPrice } = useCurrencyConverter();

	const fetchProperty = useCallback(
		async (
			id: string,
			options?: { force?: boolean; showSkeleton?: boolean },
		) => {
			const showSkeleton = options?.showSkeleton ?? false;
			if (showSkeleton) setLoading(true);
			setError(null);

			try {
				const data = await cachedGetJSON<Property>(`/api/properties/${id}`, {
					ttlMs: 2 * 60 * 1000,
					force: options?.force,
				});
				propertyCacheRef.current[id] = data;
				setProperty(data);
			} catch (e) {
				const fallback = propertyCacheRef.current[id];
				if (fallback) {
					setProperty(fallback);
				} else {
					setError(e instanceof Error ? e.message : "Failed to load property");
				}
			} finally {
				if (showSkeleton) setLoading(false);
			}
		},
		[],
	);

	// Fetch when a property is selected
	useEffect(() => {
		if (!propertyId) {
			setLoading(false);
			setError(null);
			return;
		}

		let cancelled = false;

		const cached = propertyCacheRef.current[propertyId];
		if (cached) {
			setProperty(cached);
			setLoading(false);
			setError(null);
		} else {
			setProperty(null);
			setLoading(true);
			setError(null);
		}

		fetchProperty(propertyId, {
			showSkeleton: !cached,
		}).then(() => {
			if (cancelled) return;
		});

		return () => {
			cancelled = true;
		};
	}, [propertyId, fetchProperty]);

	// Close on Escape
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape" && propertyId) onClose();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [propertyId, onClose]);

	// Prevent body scroll when open
	useEffect(() => {
		if (propertyId) document.body.style.overflow = "hidden";
		else document.body.style.overflow = "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [propertyId]);

	const isOpen = Boolean(propertyId);

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={onClose}
				className={`fixed top-[65px] left-0 right-0 bottom-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
			/>

			{/* Panel */}
			<div
				ref={panelRef}
				className={`fixed right-0 top-[65px] h-[calc(100vh-65px)] bg-card border-l border-border shadow-2xl z-40 flex flex-col
					transition-transform duration-300 ease-in-out
					w-full sm:w-[55vw] lg:w-[40vw]
					${isOpen ? "translate-x-0" : "translate-x-full"}`}
			>
				{/* Header */}
				<div className="flex flex-wrap items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
					<div className="min-w-0 flex-1">
						{property ? (
							<>
								<h1 className="font-headline text-xl font-bold text-on-surface truncate">
									{property.name}
								</h1>
								<div className="flex items-center gap-2 mt-1">
									<span
										className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
									>
										{property.status.replace(/_/g, " ")}
									</span>
									<span className="font-headline text-lg font-bold text-primary">
										{formatPrice(
											property.listingPrice ??
												property.currentValue ??
												property.purchasePrice ??
												0,
											property.country,
										)}
									</span>
								</div>
								{sharedFrom && (
									<div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 w-fit">
										<Users className="w-3 h-3 text-indigo-500 shrink-0" />
										<span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
											Shared from {sharedFrom}
										</span>
									</div>
								)}
							</>
						) : (
							<div className="h-5 w-40 bg-surface-container-highest dark:bg-surface-container rounded animate-pulse" />
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						{/* Edit property */}
						{canEdit && (
							<button
								onClick={() =>
									propertyId &&
									router.push(`/portfolio/properties/${propertyId}/edit`)
								}
								title="Edit property"
								className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container text-outline dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface transition-colors"
							>
								<Pencil className="w-4 h-4" />
							</button>
						)}
						{/* Expand to full page */}
						<button
							onClick={() =>
								propertyId && router.push(`/portfolio/properties/${propertyId}`)
							}
							title="Open full page"
							className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container text-outline dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface transition-colors"
						>
							<Maximize2 className="w-4 h-4" />
						</button>
						{/* Close */}
						<button
							onClick={onClose}
							title="Close"
							className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container text-outline dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 min-h-0 overflow-hidden">
					{loading && (
						<div className="space-y-4 px-6 py-5">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-28 bg-surface-container-high dark:bg-surface-container rounded-xl animate-pulse"
								/>
							))}
						</div>
					)}

					{error && !loading && (
						<div className="flex flex-col items-center justify-center h-48 text-center px-6">
							<p className="text-red-500 text-sm mb-3">{error}</p>
							<button
								onClick={() =>
									propertyId &&
									fetchProperty(propertyId, {
										force: true,
										showSkeleton: true,
									})
								}
								className="text-sm text-outline underline"
							>
								Try again
							</button>
						</div>
					)}

					{property && !loading && (
						<PropertyFullView
							property={property}
							isOwner
							singleColumn
							hideHeader
						/>
					)}
				</div>
			</div>
		</>
	);
}
