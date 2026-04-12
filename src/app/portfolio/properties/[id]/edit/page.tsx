"use client";

import AppShell from "@/components/layout/AppShell";
import CreatePropertyForm from "@/components/property/CreatePropertyForm";
import BackButton from "@/components/ui/BackButton";
import { useProperty } from "@/hooks/usePropertyQueries";
import Link from "next/link";
import { use } from "react";

export default function EditPropertyPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { data: property, isLoading, error } = useProperty(id);

	if (isLoading) {
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
						{error ? "Failed to load property" : "Property not found"}
					</div>
					<Link
						href="/portfolio/properties"
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
			<div className="bg-background border-b border-border px-8 py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton
						fallbackHref={`/portfolio/properties/${id}`}
						label="Back"
					/>
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						Edit: {property.name}
					</h1>
				</div>
			</div>

			<CreatePropertyForm initialProperty={property} />
		</AppShell>
	);
}
