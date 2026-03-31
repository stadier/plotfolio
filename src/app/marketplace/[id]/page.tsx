"use client";

import { useFavourites } from "@/components/FavouritesContext";
import AppShell from "@/components/layout/AppShell";
import {
	DocumentsGrid,
	formatCurrency,
	formatDate,
	getStatusColor,
} from "@/components/property/PropertyDetailContent";
import ShareModal from "@/components/property/ShareModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { PropertyAPI } from "@/lib/api";
import { getPropertyMedia } from "@/lib/utils";
import { DocumentAccessRequest, MediaType, Property } from "@/types/property";
import {
	ArrowLeft,
	Bath,
	BedDouble,
	Bookmark,
	Calendar,
	Car,
	Mail,
	MapPin,
	Mic,
	Phone,
	Play,
	Ruler,
	Share2,
	Sparkles,
	Tag,
	Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

const PropertyMiniMap = dynamic(
	() => import("@/components/maps/PropertyMiniMap"),
	{ ssr: false },
);

const MOCK_VIEWER: { id: string; name: string; email: string } = {
	id: "viewer_1",
	name: "Marketplace Viewer",
	email: "viewer@example.com",
};

/* ─── Media Gallery ──────────────────────────────────────────── */

function MediaGallery({
	media,
	name,
}: {
	media: import("@/types/property").PropertyMedia[];
	name: string;
}) {
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
	const count = media.length;
	const extra = count - 5;

	const markLoaded = (idx: number) =>
		setLoadedSet((prev) => {
			if (prev.has(idx)) return prev;
			const next = new Set(prev);
			next.add(idx);
			return next;
		});

	// Immediately mark audio items without thumbnails as loaded
	useEffect(() => {
		media.forEach((item, idx) => {
			if (item.type === MediaType.AUDIO && !item.thumbnail) {
				markLoaded(idx);
			}
		});
	}, [media]);

	function MediaButton({
		idx,
		className,
		overlay,
	}: {
		idx: number;
		className: string;
		overlay?: React.ReactNode;
	}) {
		const item = media[idx];
		return (
			<button
				type="button"
				className={`relative cursor-pointer group overflow-hidden ${className}`}
				onClick={() => setLightbox(idx)}
			>
				{/* Loading spinner */}
				{!loadedSet.has(idx) && (
					<div className="absolute inset-0 z-2 flex items-center justify-center bg-gray-100 dark:bg-surface-container">
						<div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
					</div>
				)}

				{item.type === MediaType.VIDEO ? (
					<>
						{item.thumbnail ? (
							<Image
								src={item.thumbnail}
								alt={`${name} video ${idx + 1}`}
								fill
								className="object-cover group-hover:scale-105 transition-transform duration-300"
								onLoad={() => markLoaded(idx)}
							/>
						) : (
							<video
								src={item.url}
								className="w-full h-full object-cover"
								muted
								preload="metadata"
								onLoadedData={() => markLoaded(idx)}
							/>
						)}
						<div className="absolute inset-0 flex items-center justify-center z-1">
							<div className="bg-black/50 rounded-full p-2">
								<Play className="w-6 h-6 text-white fill-white" />
							</div>
						</div>
					</>
				) : item.type === MediaType.AUDIO ? (
					<div className="w-full h-full bg-linear-to-br from-violet-600 to-indigo-800 flex flex-col items-center justify-center text-white">
						{item.thumbnail ? (
							<Image
								src={item.thumbnail}
								alt={`${name} audio ${idx + 1}`}
								fill
								className="object-cover opacity-40"
								onLoad={() => markLoaded(idx)}
							/>
						) : null}
						<Mic className="w-8 h-8 relative z-1" />
						<span className="text-xs mt-1 relative z-1">
							{item.caption ?? "Audio"}
						</span>
					</div>
				) : (
					<Image
						src={item.url}
						alt={`${name} ${idx + 1}`}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-300"
						sizes={idx === 0 ? "(max-width:768px) 100vw, 50vw" : "25vw"}
						priority={idx === 0}
						onLoad={() => markLoaded(idx)}
					/>
				)}
				{overlay}
			</button>
		);
	}

	const viewAllOverlay = extra > 0 && (
		<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-1">
			<span className="text-white font-semibold text-sm">
				View All +{extra}
			</span>
		</div>
	);

	function renderLayout() {
		if (count === 1) {
			return (
				<div className="h-[340px]">
					<MediaButton idx={0} className="w-full h-full rounded-2xl" />
				</div>
			);
		}

		if (count === 2) {
			return (
				<div className="grid grid-cols-2 gap-2 h-[340px]">
					<MediaButton idx={0} className="rounded-l-2xl" />
					<MediaButton idx={1} className="rounded-r-2xl" />
				</div>
			);
		}

		if (count === 3) {
			return (
				<div className="grid grid-cols-2 grid-rows-2 gap-2 h-[340px]">
					<MediaButton idx={0} className="row-span-2 rounded-l-2xl" />
					<MediaButton idx={1} className="rounded-tr-2xl" />
					<MediaButton idx={2} className="rounded-br-2xl" />
				</div>
			);
		}

		if (count === 4) {
			return (
				<div className="grid grid-cols-4 grid-rows-2 gap-2 h-[340px]">
					<MediaButton
						idx={0}
						className="col-span-2 row-span-2 rounded-l-2xl"
					/>
					<MediaButton idx={1} className="" />
					<MediaButton idx={2} className="rounded-tr-2xl" />
					<MediaButton idx={3} className="col-span-2 rounded-br-2xl" />
				</div>
			);
		}

		return (
			<div className="grid grid-cols-4 grid-rows-2 gap-2 h-[340px]">
				<MediaButton idx={0} className="col-span-2 row-span-2 rounded-l-2xl" />
				<MediaButton idx={1} className="" />
				<MediaButton idx={2} className="rounded-tr-2xl" />
				<MediaButton idx={3} className="" />
				<MediaButton
					idx={4}
					className="rounded-br-2xl"
					overlay={viewAllOverlay}
				/>
			</div>
		);
	}

	return (
		<>
			{renderLayout()}

			{/* Lightbox */}
			{lightbox !== null && (
				<div
					className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
					onClick={() => setLightbox(null)}
				>
					<div
						className="relative max-w-4xl max-h-[80vh] w-full h-full"
						onClick={(e) => e.stopPropagation()}
					>
						{media[lightbox].type === MediaType.VIDEO ? (
							<video
								src={media[lightbox].url}
								controls
								autoPlay
								className="w-full h-full object-contain"
							/>
						) : media[lightbox].type === MediaType.AUDIO ? (
							<div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
								<Mic className="w-16 h-16" />
								<p className="text-lg">
									{media[lightbox].caption ?? "Audio Track"}
								</p>
								<audio
									src={media[lightbox].url}
									controls
									autoPlay
									className="w-full max-w-lg"
								/>
							</div>
						) : (
							<Image
								src={media[lightbox].url}
								alt={name}
								fill
								className="object-contain"
								sizes="90vw"
							/>
						)}
					</div>
					<button
						type="button"
						className="absolute top-6 right-6 text-white/80 hover:text-white text-2xl"
						onClick={() => setLightbox(null)}
					>
						✕
					</button>
					{lightbox > 0 && (
						<button
							type="button"
							className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl"
							onClick={(e) => {
								e.stopPropagation();
								setLightbox(lightbox - 1);
							}}
						>
							‹
						</button>
					)}
					{lightbox < media.length - 1 && (
						<button
							type="button"
							className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl"
							onClick={(e) => {
								e.stopPropagation();
								setLightbox(lightbox + 1);
							}}
						>
							›
						</button>
					)}
				</div>
			)}
		</>
	);
}

/* ─── Quick Stats Pill ───────────────────────────────────────── */

function StatPill({
	icon: Icon,
	label,
}: {
	icon: React.ComponentType<
		React.SVGProps<SVGSVGElement> & { className?: string }
	>;
	label: string;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
			<Icon className="w-4 h-4" />
			{label}
		</span>
	);
}

/* ─── Detail Grid Row ────────────────────────────────────────── */

function DetailRow({
	label,
	value,
}: {
	label: string;
	value: string | undefined | null;
}) {
	if (!value) return null;
	return (
		<div className="flex flex-col gap-0.5 py-3 px-4">
			<span className="text-xs text-on-surface-variant font-medium">
				{label}
			</span>
			<span className="text-sm text-on-surface font-semibold">{value}</span>
		</div>
	);
}

/* ─── Page ───────────────────────────────────────────────────── */

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
	const { isFavourite, toggleFavourite } = useFavourites();
	const [shareOpen, setShareOpen] = useState(false);

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

	const mediaItems = getPropertyMedia(property);
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
	const areaInSqm = property.area ?? 0;
	const areaInSqft = Math.round(areaInSqm * 10.7639);
	const docCount = property.documents?.length ?? 0;
	const conditionLabels = (property.conditions ?? []).map((c) =>
		c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
	);
	const allAmenities = [...(property.amenities ?? []), ...conditionLabels];
	const visibleAmenities = allAmenities.slice(0, 8);
	const hiddenCount = allAmenities.length - 8;

	/* ─── Detail grid entries ────────────────────────────────── */
	const detailEntries: { label: string; value: string | undefined | null }[] = [
		{
			label: "Property Type",
			value: property.propertyType
				?.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		},
		{
			label: "Property Area",
			value:
				areaInSqm > 0
					? `${areaInSqft.toLocaleString()} sq ft / ${areaInSqm.toLocaleString()} sq m`
					: undefined,
		},
		{
			label: "Status",
			value: property.status
				?.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		},
		{
			label: "Bedrooms",
			value: property.bedrooms?.toString(),
		},
		{
			label: "Available From",
			value: property.availableFrom
				? formatDate(property.availableFrom)
				: undefined,
		},
		{
			label: "Bathrooms",
			value: property.bathrooms?.toString(),
		},
		{
			label: "Project",
			value: property.projectName,
		},
		{
			label: "Finishing Type",
			value: property.finishingType,
		},
		{
			label: "Zoning",
			value: property.zoning,
		},
		{
			label: "Country",
			value: property.country,
		},
	];

	return (
		<AppShell>
			{/* Breadcrumb header */}
			<div className="bg-surface-container-lowest border-b border-outline-variant/20 px-8 py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<Link
						href="/marketplace"
						className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
					>
						<ArrowLeft className="w-4 h-4" />
						Marketplace
					</Link>
					<span className="text-outline-variant">/</span>
					<span className="font-headline text-sm font-semibold text-primary truncate">
						{property.name}
					</span>
				</div>
			</div>

			<div className="px-8 py-6 space-y-8 max-w-7xl mx-auto w-full">
				{/* ─── Media Gallery ──────────────────────────────── */}
				{mediaItems.length > 0 && (
					<MediaGallery media={mediaItems} name={property.name} />
				)}

				{/* ─── Title + Quick Stats Row ───────────────────── */}
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-1.5">
						<div className="flex items-center gap-3">
							<h1 className="font-headline text-2xl font-bold text-on-surface">
								{property.name}
							</h1>
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
							>
								{property.status.replace(/_/g, " ").toUpperCase()}
							</span>
						</div>
						{property.address && (
							<p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
								<MapPin className="w-4 h-4 shrink-0" />
								{property.address}
							</p>
						)}
						{/* Quick stat pills */}
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
							{property.bathrooms != null && (
								<StatPill
									icon={Bath}
									label={`${property.bathrooms} Bathrooms`}
								/>
							)}
							{property.bedrooms != null && (
								<StatPill
									icon={BedDouble}
									label={`${property.bedrooms} Bedrooms`}
								/>
							)}
							{property.parkingSpaces != null && (
								<StatPill
									icon={Car}
									label={`${property.parkingSpaces} Parking Spaces`}
								/>
							)}
							{areaInSqft > 0 && (
								<StatPill
									icon={Ruler}
									label={`${areaInSqft.toLocaleString()} sq ft`}
								/>
							)}
							{(property.quantity ?? 1) > 1 && (
								<StatPill icon={Tag} label={`${property.quantity} units`} />
							)}
						</div>
					</div>

					{/* Price + actions */}
					<div className="flex items-center gap-3">
						<span className="text-2xl font-bold text-primary font-headline">
							{formatCurrency(askingPrice)}
						</span>
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
					</div>
				</div>

				{property && (
					<ShareModal
						property={property}
						open={shareOpen}
						onClose={() => setShareOpen(false)}
					/>
				)}

				{/* ─── Two-Column Layout ─────────────────────────── */}
				<div className="flex flex-wrap items-start gap-8">
					{/* ── Left Column (main content) ──────────────── */}
					<div className="flex-1 min-w-[320px] space-y-6">
						{/* Description */}
						{property.description && (
							<section className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5">
								<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
									Description
								</h2>
								<p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
									{property.description}
								</p>
							</section>
						)}

						{/* Property Details Grid */}
						<section className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl overflow-hidden">
							<h2 className="font-headline text-base font-semibold text-on-surface px-5 pt-5 pb-2">
								Property Details
							</h2>
							<div className="grid grid-cols-2 divide-x divide-y divide-outline-variant/20">
								{detailEntries
									.filter((e) => e.value)
									.map((e) => (
										<DetailRow key={e.label} label={e.label} value={e.value} />
									))}
							</div>
						</section>

						{/* Amenities / Conditions */}
						{allAmenities.length > 0 && (
							<section className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5">
								<h2 className="font-headline text-base font-semibold text-on-surface mb-4">
									Amenities &amp; Features
								</h2>
								<div className="flex flex-wrap gap-3">
									{visibleAmenities.map((a) => (
										<span
											key={a}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface"
										>
											<Sparkles className="w-3.5 h-3.5 text-primary" />
											{a}
										</span>
									))}
									{hiddenCount > 0 && (
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-primary cursor-pointer hover:underline">
											View All (+{hiddenCount})
										</span>
									)}
								</div>
							</section>
						)}

						{/* Documents */}
						{docCount > 0 && (
							<section className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="font-headline text-base font-semibold text-on-surface">
										Documents
									</h2>
									<span className="text-xs text-on-surface-variant">
										{docCount} file{docCount !== 1 ? "s" : ""} total
									</span>
								</div>
								<div className="text-xs text-on-surface-variant bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2">
									Some documents may require owner approval before you can view
									them.
								</div>
								<DocumentsGrid
									documents={property.documents ?? []}
									propertyId={property.id}
									onUploaded={() => {}}
									onDeleted={() => {}}
									onTypeChanged={() => {}}
									isOwner={false}
									viewerId={MOCK_VIEWER.id}
									viewerName={MOCK_VIEWER.name}
									viewerEmail={MOCK_VIEWER.email}
									accessRequests={accessRequests}
									onAccessRequested={handleAccessRequested}
								/>
							</section>
						)}
					</div>

					{/* ── Right Column (sidebar) ──────────────────── */}
					<div className="w-full max-w-xs space-y-5 shrink-0">
						{/* Map Preview */}
						{property.coordinates &&
							(property.coordinates.lat !== 0 ||
								property.coordinates.lng !== 0) && (
								<PropertyMiniMap
									lat={property.coordinates.lat}
									lng={property.coordinates.lng}
									propertyName={property.name}
								/>
							)}
						{/* Owner / Agent Details */}
						<div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 space-y-4">
							<h3 className="font-headline text-base font-semibold text-on-surface">
								{property.owner?.type === "company"
									? "Company Details"
									: "Owner Details"}
							</h3>
							<UserAvatar
								name={property.owner?.name || "Unknown"}
								displayName={property.owner?.displayName}
								username={property.owner?.username}
								avatar={property.owner?.avatar}
								ownerId={property.owner?.id}
								size="lg"
								showLabel
							/>
							{property.owner?.phone && (
								<p className="flex items-center gap-2 text-xs text-on-surface-variant">
									<Phone className="w-3.5 h-3.5" />
									{property.owner.phone}
								</p>
							)}
							{property.owner?.type && (
								<p className="flex items-center gap-2 text-xs text-on-surface-variant">
									<Wallet className="w-3.5 h-3.5" />
									{property.owner.type.charAt(0).toUpperCase() +
										property.owner.type.slice(1)}
								</p>
							)}

							{/* Action buttons */}
							<div className="flex gap-2">
								{property.owner?.phone && (
									<a
										href={`tel:${property.owner.phone}`}
										className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
									>
										<Phone className="w-4 h-4" />
										Contact
									</a>
								)}
								{property.owner?.email && (
									<a
										href={`mailto:${property.owner.email}`}
										className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-primary text-primary hover:bg-primary/5 transition-colors"
									>
										<Mail className="w-4 h-4" />
										Email
									</a>
								)}
							</div>
							<Link
								href={`/profile/${property.owner?.id}`}
								className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold border border-outline-variant/40 text-on-surface hover:bg-surface-container-high transition-colors"
							>
								Register Interest
							</Link>
						</div>

						{/* Schedule Viewing */}
						{property.owner?.allowBookings && (
							<div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 space-y-3">
								<h3 className="font-headline text-base font-semibold text-on-surface">
									Schedule Viewing
								</h3>
								<div className="text-xs text-on-surface-variant leading-relaxed">
									<p>Live tours available:</p>
									<p>Monday to Saturday 9:00 AM – 6:00 PM</p>
								</div>
								<Link
									href={`/profile/${property.owner?.id}`}
									className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
								>
									<Calendar className="w-4 h-4" />
									Schedule a Visit
								</Link>
							</div>
						)}

						{/* Listing Info */}
						<div className="text-xs text-on-surface-variant space-y-1 px-1">
							{property.createdAt && (
								<p>
									Listed:{" "}
									<span className="text-on-surface font-medium">
										{formatDate(property.createdAt)}
									</span>
								</p>
							)}
							{docCount > 0 && (
								<p>
									Documents:{" "}
									<span className="text-on-surface font-medium">
										{docCount} file{docCount !== 1 ? "s" : ""} available
									</span>
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
