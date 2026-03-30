"use client";

import AppShell from "@/components/layout/AppShell";
import {
	DOCUMENT_CATEGORIES,
	DocumentSection,
	formatCurrency,
	getStatusColor,
} from "@/components/property/PropertyDetailContent";
import UserAvatar from "@/components/ui/UserAvatar";
import { PropertyAPI } from "@/lib/api";
import { DocumentAccessRequest, Property } from "@/types/property";
import { ArrowLeft, Copy, FileText, MapPin, Ruler, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

const MOCK_VIEWER = {
	id: "viewer_1",
	name: "Marketplace Viewer",
	email: "viewer@example.com",
};

export default function MarketplaceListingPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [property, setProperty] = useState<Property | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [accessRequests, setAccessRequests] = useState<DocumentAccessRequest[]>(
		[],
	);

	const loadAccessRequests = useCallback(async (propertyId: string) => {
		const reqs = await PropertyAPI.getDocumentAccessRequests(propertyId, {
			requesterId: MOCK_VIEWER.id,
		});
		setAccessRequests(reqs);
	}, []);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const data = await PropertyAPI.getProperty(id);
				if (!data) throw new Error("Listing not found");
				setProperty(data);
				await loadAccessRequests(id);
			} catch {
				setError("Failed to load listing");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id, loadAccessRequests]);

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

	const heroImage = property.images?.[0];
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
	const docCount = property.documents?.length ?? 0;

	return (
		<AppShell>
			{/* Header */}
			<div className="bg-surface-container-lowest border-b border-outline-variant/20 px-8 py-5 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<Link
						href="/marketplace"
						className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
					>
						<ArrowLeft className="w-4 h-4" />
						Marketplace
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
				</div>
			</div>

			<div className="px-8 py-6 space-y-6">
				{/* Hero section */}
				<div className="flex flex-wrap items-start gap-6">
					{/* Image */}
					<div className="w-full max-w-sm">
						<div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 dark:bg-surface-container border border-gray-200 dark:border-outline-variant">
							{heroImage ? (
								<Image
									src={heroImage}
									alt={property.name}
									fill
									className="object-cover"
									sizes="400px"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-on-surface-variant">
									<MapPin className="w-12 h-12" />
								</div>
							)}
						</div>
					</div>

					{/* Key details */}
					<div className="w-full max-w-sm space-y-4">
						<div>
							<div className="text-2xl font-bold text-gray-900 dark:text-on-surface">
								{formatCurrency(askingPrice)}
							</div>
							<div className="text-xs text-gray-500 dark:text-on-surface-variant mt-1">
								Asking price
							</div>
						</div>

						<div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-on-surface-variant">
							{property.area != null && (
								<div className="flex items-center gap-1.5">
									<Ruler className="w-4 h-4" />
									{property.area.toLocaleString()} sqm
								</div>
							)}
							{property.address && (
								<div className="flex items-center gap-1.5">
									<MapPin className="w-4 h-4" />
									<span className="truncate max-w-[200px]">
										{property.address}
									</span>
								</div>
							)}
							{property.propertyType && (
								<div className="flex items-center gap-1.5">
									<Tag className="w-4 h-4" />
									{property.propertyType
										.replace(/_/g, " ")
										.replace(/\b\w/g, (c) => c.toUpperCase())}
								</div>
							)}
							{docCount > 0 && (
								<div className="flex items-center gap-1.5">
									<FileText className="w-4 h-4" />
									{docCount} document{docCount !== 1 ? "s" : ""}
								</div>
							)}
							{(property.quantity ?? 1) > 1 && (
								<div className="flex items-center gap-1.5">
									<Copy className="w-4 h-4" />
									{property.quantity} units available
								</div>
							)}
						</div>

						{property.description && (
							<p className="text-sm text-gray-600 dark:text-on-surface-variant leading-relaxed">
								{property.description}
							</p>
						)}

						{/* Seller */}
						<div className="pt-3 border-t border-gray-200 dark:border-outline-variant">
							<div className="text-xs text-gray-500 dark:text-on-surface-variant mb-2 uppercase tracking-wide font-semibold">
								Listed by
							</div>
							<UserAvatar
								name={property.owner?.name || "Unknown"}
								displayName={property.owner?.displayName}
								username={property.owner?.username}
								avatar={property.owner?.avatar}
								ownerId={property.owner?.id}
								size="md"
								showLabel
							/>
						</div>
					</div>
				</div>

				{/* Documents section — viewer mode */}
				<div className="w-full max-w-2xl space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide dark:text-on-surface">
							Documents
						</h2>
						<span className="text-xs text-gray-500 dark:text-on-surface-variant">
							{property.documents?.length ?? 0} file
							{(property.documents?.length ?? 0) !== 1 ? "s" : ""} total
						</span>
					</div>
					<div className="text-xs text-gray-500 dark:text-on-surface-variant bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2">
						Some documents may require owner approval before you can view them.
					</div>
					{DOCUMENT_CATEGORIES.map((category) => (
						<DocumentSection
							key={category.type}
							category={category}
							documents={property.documents ?? []}
							propertyId={property.id}
							onUploaded={() => {}}
							onDeleted={() => {}}
							isOwner={false}
							viewerId={MOCK_VIEWER.id}
							viewerName={MOCK_VIEWER.name}
							viewerEmail={MOCK_VIEWER.email}
							accessRequests={accessRequests}
							onAccessRequested={handleAccessRequested}
						/>
					))}
				</div>
			</div>
		</AppShell>
	);
}
