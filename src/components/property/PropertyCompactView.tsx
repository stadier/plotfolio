"use client";

import MediaLightbox from "@/components/property/MediaLightbox";
import {
	DocumentsGrid,
	formatCurrency,
	formatDate,
	getStatusColor,
} from "@/components/property/propertyDisplayHelpers";
import UserAvatar from "@/components/ui/UserAvatar";
import { getPropertyMedia } from "@/lib/utils";
import {
	DocumentAccessRequest,
	MediaType,
	Property,
	PropertyMedia,
} from "@/types/property";
import {
	Bath,
	BedDouble,
	Calendar,
	Car,
	Mail,
	MapPin,
	Mic,
	Phone,
	Play,
	Ruler,
	Sparkles,
	Tag,
	Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PropertyMiniMap = dynamic(
	() => import("@/components/maps/PropertyMiniMap"),
	{ ssr: false },
);

/* ─── Media Gallery ──────────────────────────────────────────── */

function MediaGallery({
	media,
	name,
}: {
	media: PropertyMedia[];
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

			{lightbox !== null && (
				<MediaLightbox
					media={media}
					currentIndex={lightbox}
					name={name}
					onClose={() => setLightbox(null)}
					onPrev={() => setLightbox(lightbox - 1)}
					onNext={() => setLightbox(lightbox + 1)}
				/>
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

/* ─── Owner / Agent Sidebar Card ─────────────────────────────── */

function OwnerSidebarCard({ property }: { property: Property }) {
	return (
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
	);
}

/* ─── Schedule Viewing Card ──────────────────────────────────── */

function ScheduleViewingCard({ property }: { property: Property }) {
	if (!property.owner?.allowBookings) return null;
	return (
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
	);
}

/* ─── Listing Meta Info ──────────────────────────────────────── */

function ListingMetaInfo({
	property,
	docCount,
}: {
	property: Property;
	docCount: number;
}) {
	return (
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
	);
}

/* ─── Detail entries builder ─────────────────────────────────── */

function buildDetailEntries(property: Property) {
	const areaInSqm = property.area ?? 0;
	const areaInSqft = Math.round(areaInSqm * 10.7639);

	return [
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
		{ label: "Bedrooms", value: property.bedrooms?.toString() },
		{
			label: "Available From",
			value: property.availableFrom
				? formatDate(property.availableFrom)
				: undefined,
		},
		{ label: "Bathrooms", value: property.bathrooms?.toString() },
		{ label: "Project", value: property.projectName },
		{ label: "Finishing Type", value: property.finishingType },
		{ label: "Zoning", value: property.zoning },
		{ label: "Country", value: property.country },
	];
}

/* ─── Sections ───────────────────────────────────────────────── */

function TitleSection({
	property,
	compact,
	actions,
}: {
	property: Property;
	compact?: boolean;
	actions?: React.ReactNode;
}) {
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
	const areaInSqm = property.area ?? 0;
	const areaInSqft = Math.round(areaInSqm * 10.7639);

	return (
		<div className="flex flex-wrap items-start justify-between gap-4">
			<div className="space-y-1.5 min-w-0 flex-1">
				<div className="flex items-center gap-3">
					<h1
						className={`font-headline font-bold text-on-surface ${compact ? "text-lg" : "text-2xl"}`}
					>
						{property.name}
					</h1>
					<span
						className={`px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getStatusColor(property.status)}`}
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
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
					{property.bathrooms != null && (
						<StatPill icon={Bath} label={`${property.bathrooms} Bathrooms`} />
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

			{/* Price + action buttons */}
			<div className="flex items-center gap-3 shrink-0">
				<span
					className={`font-bold text-primary font-headline ${compact ? "text-lg" : "text-2xl"}`}
				>
					{formatCurrency(askingPrice)}
				</span>
				{actions}
			</div>
		</div>
	);
}

function DescriptionSection({ description }: { description: string }) {
	return (
		<section className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5">
			<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
				Description
			</h2>
			<p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
				{description}
			</p>
		</section>
	);
}

function PropertyDetailsGrid({ property }: { property: Property }) {
	const entries = buildDetailEntries(property);
	return (
		<section className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-2xl overflow-hidden">
			<h2 className="font-headline text-base font-semibold text-on-surface px-5 pt-5 pb-2">
				Property Details
			</h2>
			<div className="grid grid-cols-2 divide-x divide-y divide-outline-variant/20">
				{entries
					.filter((e) => e.value)
					.map((e) => (
						<DetailRow key={e.label} label={e.label} value={e.value} />
					))}
			</div>
		</section>
	);
}

function AmenitiesSection({ property }: { property: Property }) {
	const conditionLabels = (property.conditions ?? []).map((c) =>
		c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
	);
	const allAmenities = [...(property.amenities ?? []), ...conditionLabels];
	if (allAmenities.length === 0) return null;

	const visibleAmenities = allAmenities.slice(0, 8);
	const hiddenCount = allAmenities.length - 8;

	return (
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
	);
}

function DocumentsSection({
	property,
	accessRequests,
	onAccessRequested,
	viewer,
	isOwner,
}: {
	property: Property;
	accessRequests?: DocumentAccessRequest[];
	onAccessRequested?: (req: DocumentAccessRequest) => void;
	viewer?: { id: string; name: string; email: string };
	isOwner?: boolean;
}) {
	const docCount = property.documents?.length ?? 0;
	if (docCount === 0) return null;

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-headline text-base font-semibold text-on-surface">
					Documents
				</h2>
				<span className="text-xs text-on-surface-variant">
					{docCount} file{docCount !== 1 ? "s" : ""} total
				</span>
			</div>
			{!isOwner && (
				<div className="text-xs text-on-surface-variant bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2">
					Some documents may require owner approval before you can view them.
				</div>
			)}
			<DocumentsGrid
				documents={property.documents ?? []}
				propertyId={property.id}
				onUploaded={() => {}}
				onDeleted={() => {}}
				onTypeChanged={() => {}}
				isOwner={isOwner ?? false}
				viewerId={viewer?.id}
				viewerName={viewer?.name}
				viewerEmail={viewer?.email}
				accessRequests={accessRequests ?? []}
				onAccessRequested={onAccessRequested}
			/>
		</section>
	);
}

/* ─── Main Component ─────────────────────────────────────────── */

export interface PropertyCompactViewProps {
	property: Property;
	/** "full" = marketplace-style two-col with gallery; "compact" = stacked for sidebar/drawer */
	layout?: "full" | "compact";
	/** Action buttons rendered next to the price (bookmark, share, etc.) */
	actions?: React.ReactNode;
	/** Document access requests for viewer mode */
	accessRequests?: DocumentAccessRequest[];
	/** Callback when a document access request is made */
	onAccessRequested?: (req: DocumentAccessRequest) => void;
	/** Viewer identity for document access */
	viewer?: { id: string; name: string; email: string };
	/** Whether to show the media gallery (default true for full, false for compact) */
	showGallery?: boolean;
	/** Whether to show the owner sidebar card */
	showOwner?: boolean;
	/** Whether the current user owns this property */
	isOwner?: boolean;
	/** Extra class name on the root container */
	className?: string;
}

export default function PropertyCompactView({
	property,
	layout = "full",
	actions,
	accessRequests,
	onAccessRequested,
	viewer,
	showGallery,
	showOwner = true,
	isOwner,
	className = "",
}: PropertyCompactViewProps) {
	const mediaItems = getPropertyMedia(property);
	const docCount = property.documents?.length ?? 0;
	const hasCoordinates =
		property.coordinates &&
		(property.coordinates.lat !== 0 || property.coordinates.lng !== 0);
	const isCompact = layout === "compact";
	const shouldShowGallery = showGallery ?? !isCompact;

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Media Gallery */}
			{shouldShowGallery && mediaItems.length > 0 && (
				<MediaGallery media={mediaItems} name={property.name} />
			)}

			{/* Two-column layout for full, stacked for compact */}
			{isCompact ? (
				<div className="space-y-5">
					{/* Map preview */}
					{hasCoordinates && (
						<PropertyMiniMap
							lat={property.coordinates.lat}
							lng={property.coordinates.lng}
							propertyName={property.name}
						/>
					)}

					{property.description && (
						<DescriptionSection description={property.description} />
					)}

					<PropertyDetailsGrid property={property} />
					<AmenitiesSection property={property} />

					<DocumentsSection
						property={property}
						accessRequests={accessRequests}
						onAccessRequested={onAccessRequested}
						viewer={viewer}
						isOwner={isOwner}
					/>

					{/* Owner */}
					{showOwner && <OwnerSidebarCard property={property} />}
					<ScheduleViewingCard property={property} />
					<ListingMetaInfo property={property} docCount={docCount} />
				</div>
			) : (
				<div className="flex flex-wrap items-start gap-8">
					{/* Left column */}
					<div className="flex-1 min-w-[320px] space-y-6">
						{property.description && (
							<DescriptionSection description={property.description} />
						)}

						<PropertyDetailsGrid property={property} />
						<AmenitiesSection property={property} />

						<DocumentsSection
							property={property}
							accessRequests={accessRequests}
							onAccessRequested={onAccessRequested}
							viewer={viewer}
							isOwner={isOwner}
						/>
					</div>

					{/* Right column (sidebar) */}
					<div className="w-full max-w-xs space-y-5 shrink-0">
						{hasCoordinates && (
							<PropertyMiniMap
								lat={property.coordinates.lat}
								lng={property.coordinates.lng}
								propertyName={property.name}
							/>
						)}
						{showOwner && <OwnerSidebarCard property={property} />}
						<ScheduleViewingCard property={property} />
						<ListingMetaInfo property={property} docCount={docCount} />
					</div>
				</div>
			)}
		</div>
	);
}
