"use client";

import AppShell from "@/components/layout/AppShell";
import ListingDetailViewAlt from "@/components/property/ListingDetailViewAlt";
import { getStatusColor } from "@/components/property/PropertyDetailContent";
import ShareModal from "@/components/property/ShareModal";
import { useProperty } from "@/hooks/usePropertyQueries";
import { ArrowLeft, Pencil, Share2 } from "lucide-react";
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
			<div className="bg-surface-container-lowest border-b border-outline-variant/20 px-8 py-4 z-10">
				<div className="flex items-center gap-3">
					<Link
						href="/portfolio/properties"
						className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
					>
						<ArrowLeft className="w-4 h-4" />
						Properties
					</Link>
					<span className="text-outline-variant">/</span>
					<h1 className="font-headline text-sm font-semibold text-primary truncate">
						{property.name}
					</h1>
					<span
						className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
					>
						{property.status.replace(/_/g, " ").toUpperCase()}
					</span>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-hidden">
				<ListingDetailViewAlt
					property={property}
					isOwner
					actions={
						<>
							<Link
								href={`/portfolio/properties/${id}/edit`}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Edit property"
							>
								<Pencil className="w-5 h-5 text-on-surface-variant" />
							</Link>
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
