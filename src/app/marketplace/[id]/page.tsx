"use client";

import { useFavourites } from "@/components/FavouritesContext";
import AppShell from "@/components/layout/AppShell";
import PropertyFullView from "@/components/property/PropertyFullView";
import ShareModal from "@/components/property/ShareModal";
import BackButton from "@/components/ui/BackButton";
import { useProperty } from "@/hooks/usePropertyQueries";
import { PropertyAPI } from "@/lib/api";
import { DocumentAccessRequest } from "@/types/property";
import { Bookmark, Share2 } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

const MOCK_VIEWER: { id: string; name: string; email: string } = {
	id: "viewer_1",
	name: "Marketplace Viewer",
	email: "viewer@example.com",
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function MarketplaceListingPage({
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
		? "Failed to load listing"
		: !loading && !property
			? "Listing not found"
			: null;
	const [accessRequests, setAccessRequests] = useState<DocumentAccessRequest[]>(
		[],
	);
	const { isFavourite, toggleFavourite } = useFavourites();
	const [shareOpen, setShareOpen] = useState(false);

	const loadAccessRequests = useCallback(async (propertyId: string) => {
		const reqs = await PropertyAPI.getDocumentAccessRequests(propertyId, {
			requesterId: MOCK_VIEWER.id,
		});
		setAccessRequests(reqs);
	}, []);

	useEffect(() => {
		if (property) loadAccessRequests(id);
	}, [id, property, loadAccessRequests]);

	function handleAccessRequested(req: DocumentAccessRequest) {
		setAccessRequests((prev) => [...prev, req]);
	}

	if (loading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center h-full">
					<div className="text-on-surface-variant animate-pulse font-body">
						Loading listing…
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
						{error ?? "Listing not found"}
					</div>
					<Link
						href="/marketplace"
						className="text-sm text-on-surface-variant hover:text-primary transition-colors"
					>
						← Back to Marketplace
					</Link>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell scrollable={false}>
			{/* Breadcrumb header */}
			<div className="bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-8 py-3 sm:py-4 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/marketplace" label="Marketplace" />
					<span className="text-outline-variant">/</span>
					<span className="font-headline text-sm font-semibold text-primary truncate">
						{property.name}
					</span>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-hidden">
				<PropertyFullView
					property={property}
					accessRequests={accessRequests}
					onAccessRequested={handleAccessRequested}
					viewer={MOCK_VIEWER}
					actions={
						<>
							<button
								type="button"
								onClick={() => toggleFavourite(id)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Save listing"
							>
								<Bookmark
									className={`w-5 h-5 ${isFavourite(id) ? "fill-red-500 text-red-500" : "text-on-surface-variant"}`}
								/>
							</button>
							<button
								type="button"
								onClick={() => setShareOpen(true)}
								className="p-2 rounded-full border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
								title="Share listing"
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
