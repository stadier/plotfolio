"use client";

import AppShell from "@/components/layout/AppShell";
import CreatePropertyForm from "@/components/property/CreatePropertyForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function generatePropertyName(): string {
	const now = new Date();
	const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = now.getFullYear().toString().slice(-2);
	const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `PLT-${month}${year}-${seq}`;
}

export default function NewPropertyPage() {
	const [propertyName, setPropertyName] = useState("");

	useEffect(() => {
		setPropertyName(generatePropertyName());
	}, []);

	return (
		<AppShell>
			{/* Page header */}
			<div className="bg-card border-b border-border px-8 py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<Link
						href="/portfolio/properties"
						className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
					>
						<ArrowLeft className="w-4 h-4" />
						Properties
					</Link>
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						{propertyName}
					</h1>
				</div>
			</div>

			{/* Body */}
			<div className="px-8 pt-6 pb-0">
				<CreatePropertyForm
					initialName={propertyName}
					onNameChange={setPropertyName}
				/>
			</div>
		</AppShell>
	);
}
