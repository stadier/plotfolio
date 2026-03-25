"use client";

import AppShell from "@/components/layout/AppShell";
import PropertyDetailContent, {
	getStatusColor,
} from "@/components/property/PropertyDetailContent";
import { Property } from "@/types/property";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

const API_BASE = "/api";

// ===========================
// Main page
// ===========================
export default function PropertyDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [property, setProperty] = useState<Property | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const res = await fetch(`${API_BASE}/properties/${id}`);
				if (!res.ok) throw new Error("Property not found");
				const data = await res.json();
				setProperty(data);
			} catch {
				setError("Failed to load property");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	async function patchProperty(updates: Partial<Property>) {
		if (!property) return;
		setSaving(true);
		try {
			const res = await fetch(`${API_BASE}/properties/${property.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (res.ok) {
				const updated = await res.json();
				setProperty(updated);
			}
		} finally {
			setSaving(false);
		}
	}

	function handleDocUploaded(doc: Property["documents"][0]) {
		if (!property) return;
		setProperty({
			...property,
			documents: [...(property.documents ?? []), doc],
		});
	}

	function handleDocDeleted(docId: string) {
		if (!property) return;
		setProperty({
			...property,
			documents: property.documents.filter((d) => d.id !== docId),
		});
	}

	if (loading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center h-full">
					<div className="text-on-surface-variant animate-pulse font-body">
						Loading property…
					</div>
				</div>
			</AppShell>
		);
	}

	if (error || !property) {
		return (
			<AppShell>
				<div className="flex flex-1 flex-col items-center justify-center h-full gap-4">
					<div className="text-error font-body">
						{error ?? "Property not found"}
					</div>
					<Link
						href="/properties"
						className="text-sm text-on-surface-variant hover:text-primary transition-colors"
					>
						← Back to Properties
					</Link>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell>
			{/* Page header */}
			<div className="bg-surface-container-lowest border-b border-outline-variant/20 px-8 py-5 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<Link
						href="/properties"
						className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
					>
						<ArrowLeft className="w-4 h-4" />
						Properties
					</Link>
					<span className="text-outline-variant">/</span>
					<h1 className="font-headline text-base font-semibold text-primary truncate">
						{property.name}
					</h1>
					<span
						className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
					>
						{property.status.replace(/_/g, " ").toUpperCase()}
					</span>
					{saving && (
						<span className="ml-auto text-xs text-on-surface-variant animate-pulse font-body">
							Saving…
						</span>
					)}
				</div>
			</div>

			{/* Body */}
			<div className="px-8 py-6">
				<PropertyDetailContent
					property={property}
					onPatch={patchProperty}
					onDocUploaded={handleDocUploaded}
					onDocDeleted={handleDocDeleted}
					layout="two-col"
				/>
			</div>
		</AppShell>
	);
}
