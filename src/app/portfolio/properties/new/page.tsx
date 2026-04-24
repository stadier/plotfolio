"use client";

import AppShell from "@/components/layout/AppShell";
import CreatePropertyForm from "@/components/property/CreatePropertyForm";
import BackButton from "@/components/ui/BackButton";
import { useEffect, useState } from "react";

function generatePropertyName(): string {
	const now = new Date();
	const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = now.getFullYear().toString().slice(-2);
	const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `PLOT-${month}${year}-${seq}`;
}

export default function NewPropertyPage() {
	const [propertyName, setPropertyName] = useState("");

	useEffect(() => {
		setPropertyName(generatePropertyName());
	}, []);

	return (
		<AppShell>
			{/* Page header */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/portfolio/properties" label="Properties" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						{propertyName}
					</h1>
				</div>
			</div>

			{/* Body */}
			<div className="px-4 sm:px-8 pt-6 pb-0">
				<CreatePropertyForm
					initialName={propertyName}
					onNameChange={setPropertyName}
				/>
			</div>
		</AppShell>
	);
}
