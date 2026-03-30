"use client";

import { Property } from "@/types/property";
import { Maximize2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import PropertyDetailContent, {
	formatCurrency,
	getStatusColor,
} from "./PropertyDetailContent";

interface PropertyDrawerProps {
	propertyId: string | null;
	onClose: () => void;
	onChange?: (property: Property) => void;
}

export default function PropertyDrawer({
	propertyId,
	onClose,
	onChange,
}: PropertyDrawerProps) {
	const [property, setProperty] = useState<Property | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);

	// Fetch when a property is selected
	useEffect(() => {
		if (!propertyId) {
			setProperty(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		fetch(`/api/properties/${propertyId}`)
			.then((r) => {
				if (!r.ok) throw new Error("Failed to load property");
				return r.json();
			})
			.then((data) => {
				if (!cancelled) setProperty(data);
			})
			.catch((e) => {
				if (!cancelled) setError(e.message);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [propertyId]);

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

	const handlePatch = useCallback(
		async (updates: Partial<Property>) => {
			if (!property) return;
			const res = await fetch(`/api/properties/${property.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (res.ok) {
				const updated = await res.json();
				setProperty(updated);
				onChange?.(updated);
			}
		},
		[property, onChange],
	);

	const handleDocUploaded = useCallback((doc: Property["documents"][0]) => {
		setProperty((prev) =>
			prev ? { ...prev, documents: [...(prev.documents ?? []), doc] } : prev,
		);
	}, []);

	const handleDocDeleted = useCallback((docId: string) => {
		setProperty((prev) =>
			prev
				? {
						...prev,
						documents: (prev.documents ?? []).filter((d) => d.id !== docId),
					}
				: prev,
		);
	}, []);

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
				className={`fixed right-0 top-[65px] h-[calc(100vh-65px)] bg-slate-50 dark:bg-background border-l border-slate-200 dark:border-outline-variant shadow-2xl z-40 flex flex-col
					transition-transform duration-300 ease-in-out
					w-full sm:w-[55vw] lg:w-[50vw]
					${isOpen ? "translate-x-0" : "translate-x-full"}`}
			>
				{/* Header */}
				<div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-outline-variant shrink-0">
					<div className="min-w-0 flex-1 mr-4">
						{property ? (
							<>
								<h2 className="text-base font-semibold text-on-surface truncate">
									{property.name}
								</h2>
								<div className="flex items-center gap-2 mt-1">
									<span
										className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
									>
										{property.status.replace(/_/g, " ")}
									</span>
									<span className="text-sm text-on-surface-variant">
										{formatCurrency(property.purchasePrice)}
									</span>
								</div>
							</>
						) : (
							<div className="h-5 w-40 bg-gray-200 dark:bg-surface-container rounded animate-pulse" />
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						{/* Edit property */}
						<button
							onClick={() =>
								propertyId && router.push(`/portfolio/properties/${propertyId}`)
							}
							title="Edit property"
							className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container text-gray-500 dark:text-on-surface-variant hover:text-gray-800 dark:hover:text-on-surface transition-colors"
						>
							<Pencil className="w-4 h-4" />
						</button>
						{/* Expand to full page */}
						<button
							onClick={() =>
								propertyId && router.push(`/portfolio/properties/${propertyId}`)
							}
							title="Open full page"
							className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container text-gray-500 dark:text-on-surface-variant hover:text-gray-800 dark:hover:text-on-surface transition-colors"
						>
							<Maximize2 className="w-4 h-4" />
						</button>
						{/* Close */}
						<button
							onClick={onClose}
							title="Close"
							className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-container text-gray-500 dark:text-on-surface-variant hover:text-gray-800 dark:hover:text-on-surface transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-6 py-5">
					{loading && (
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-28 bg-gray-100 dark:bg-surface-container rounded-xl animate-pulse"
								/>
							))}
						</div>
					)}

					{error && !loading && (
						<div className="flex flex-col items-center justify-center h-48 text-center">
							<p className="text-red-500 text-sm mb-3">{error}</p>
							<button
								onClick={() => propertyId && setLoading(true)}
								className="text-sm text-gray-500 underline"
							>
								Try again
							</button>
						</div>
					)}

					{property && !loading && (
						<PropertyDetailContent
							property={property}
							onPatch={handlePatch}
							onDocUploaded={handleDocUploaded}
							onDocDeleted={handleDocDeleted}
							layout="stack"
						/>
					)}
				</div>
			</div>
		</>
	);
}
