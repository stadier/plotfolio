"use client";

import AppShell from "@/components/layout/AppShell";
import PropertyFullView from "@/components/property/PropertyFullView";
import PropertyViewLayoutToggle from "@/components/property/PropertyViewLayoutToggle";
import ShareModal from "@/components/property/ShareModal";
import StatusToggle from "@/components/property/StatusToggle";
import BackButton from "@/components/ui/BackButton";
import { PropertyDetailSkeleton } from "@/components/ui/skeletons";
import { useProperty, useUpdateProperty } from "@/hooks/usePropertyQueries";
import { FileText, Handshake, Layers, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

// ===========================
// Main page
// ===========================
export default function PropertyDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const {
		data: property,
		isLoading: loading,
		error: queryError,
	} = useProperty(id);
	const error = queryError
		? "Failed to load property"
		: !loading && !property
			? "Property not found"
			: null;
	const [shareOpen, setShareOpen] = useState(false);
	const [contractOpen, setContractOpen] = useState(false);
	const updateProperty = useUpdateProperty();
	const parentId = property?.parentPropertyId ?? null;
	const { data: parentProperty } = useProperty(parentId ?? "");

	if (loading) {
		return (
			<AppShell scrollable={false}>
				{/* Real page header — only the title placeholder shimmers */}
				<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 z-10">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0">
						<BackButton
							fallbackHref="/portfolio/properties"
							label="Properties"
						/>
						<span className="text-outline-variant hidden sm:inline">/</span>
						<div className="skeleton h-4 w-32 rounded-md" />
					</div>
				</div>
				<div className="flex-1 min-h-0 overflow-hidden">
					<PropertyDetailSkeleton />
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
		<AppShell scrollable={false}>
			{/* Page header */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 z-10">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Properties" />
					<span className="text-outline-variant hidden sm:inline">/</span>
					{parentId && parentProperty && (
						<>
							<Link
								href={`/portfolio/properties/${parentId}`}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wide hover:bg-primary/20 transition-colors max-w-40"
								title={`Back to ${parentProperty.name}`}
							>
								<Layers className="w-3 h-3 shrink-0" />
								<span className="truncate">{parentProperty.name}</span>
							</Link>
							<span className="text-outline-variant">↳</span>
						</>
					)}
					<h1 className="font-headline text-sm font-semibold text-primary truncate">
						{property.name}
					</h1>
					<StatusToggle
						property={property}
						onToggle={(newStatus) =>
							updateProperty.mutate({
								id: property.id,
								updates: { status: newStatus },
							})
						}
						isPending={updateProperty.isPending}
					/>
					<PropertyViewLayoutToggle className="ml-auto" />
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-hidden">
				<PropertyFullView
					property={property}
					isOwner
					actions={
						<>
							<Link
								href={`/portfolio/properties/${id}/sell`}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Initiate sale"
							>
								<Handshake className="w-5 h-5 text-on-surface-variant" />
							</Link>
							<Link
								href={`/portfolio/properties/${id}/edit`}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Edit property"
							>
								<Pencil className="w-5 h-5 text-on-surface-variant" />
							</Link>
							<button
								type="button"
								onClick={() => setContractOpen(true)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Generate contract"
							>
								<FileText className="w-5 h-5 text-on-surface-variant" />
							</button>
							<button
								type="button"
								onClick={() => setShareOpen(true)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Share property"
							>
								<Share2 className="w-5 h-5 text-on-surface-variant" />
							</button>
						</>
					}
					quickActions={[
						{
							label: "Initiate Sale",
							description: "List or sell this property",
							icon: Handshake,
							href: `/portfolio/properties/${id}/sell`,
							primary: true,
						},
						{
							label: "Edit Property",
							description: "Update details & media",
							icon: Pencil,
							href: `/portfolio/properties/${id}/edit`,
						},
						{
							label: "Generate Contract",
							description: "Create a legal document",
							icon: FileText,
							onClick: () => setContractOpen(true),
						},
						{
							label: "Share",
							description: "Send a link or invite",
							icon: Share2,
							onClick: () => setShareOpen(true),
						},
					]}
					showContractGenerator={contractOpen}
					onCloseContractGenerator={() => setContractOpen(false)}
				/>

				{property && (
					<ShareModal
						property={property}
						open={shareOpen}
						onClose={() => setShareOpen(false)}
					/>
				)}
			</div>
		</AppShell>
	);
}
