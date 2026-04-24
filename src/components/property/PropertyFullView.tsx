"use client";

import BookingModal from "@/components/property/BookingModal";
import LinkedDocumentsSection from "@/components/property/LinkedDocumentsSection";
import MediaLightbox from "@/components/property/MediaLightbox";
import OwnershipPanel from "@/components/property/OwnershipPanel";
import PropertySettingsPanel from "@/components/property/PropertySettingsPanel";
import { DocumentsGrid } from "@/components/property/propertyDisplayHelpers";
import ActiveSalePanel from "@/components/sales/ActiveSalePanel";
import MasonryGrid from "@/components/ui/MasonryGrid";
import UserAvatar from "@/components/ui/UserAvatar";
import { queryKeys, useUpdateProperty } from "@/hooks/usePropertyQueries";
import { countryFlag } from "@/lib/locale";
import { toPlotWords } from "@/lib/plotwords";
import { formatCurrency, getPropertyMedia } from "@/lib/utils";
import {
	DocumentAccessRequest,
	MediaType,
	Property,
	PropertyMedia,
	PropertySettings,
} from "@/types/property";
import { useQueryClient } from "@tanstack/react-query";
import {
	Bath,
	BedDouble,
	Building2,
	Car,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Expand,
	Fence,
	Home,
	ImagePlus,
	Landmark,
	Mail,
	MapPin,
	MessageCircle,
	Mic,
	Phone,
	Play,
	Plus,
	Ruler,
	Shield,
	Sparkles,
	Star,
	Tag,
	TreePine,
	Upload,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatDate, getStatusColor } from "./PropertyDetailContent";
import StatusToggle from "./StatusToggle";

const PropertyMiniMap = dynamic(
	() => import("@/components/maps/PropertyMiniMap"),
	{ ssr: false },
);

const DocumentGenerator = dynamic(
	() => import("@/components/branding/DocumentGenerator"),
	{ ssr: false },
);

/* ─── Media Gallery (masonry, natural aspect ratios) ─────────── */

interface PendingMedia {
	id: number;
	file: File;
	previewUrl: string;
	status: "uploading" | "failed";
	error?: string;
}

function MediaGallery({
	media,
	name,
	isOwner,
	propertyId,
}: {
	media: PropertyMedia[];
	name: string;
	isOwner?: boolean;
	propertyId?: string;
}) {
	const queryClient = useQueryClient();
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);
	const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
	const pendingIdRef = useRef(0);
	const addInputRef = useRef<HTMLInputElement>(null);

	function detectMediaType(file: File): "image" | "video" | "audio" {
		if (file.type.startsWith("video/")) return "video";
		if (file.type.startsWith("audio/")) return "audio";
		return "image";
	}

	async function uploadSingle(id: number, file: File) {
		if (!propertyId) return;
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", detectMediaType(file));
			const res = await fetch(`/api/properties/${propertyId}/media`, {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error ?? "Upload failed");
			}
			setPendingMedia((prev) => prev.filter((p) => p.id !== id));
			await queryClient.invalidateQueries({
				queryKey: queryKeys.properties.detail(propertyId),
			});
		} catch (err) {
			const error = err instanceof Error ? err.message : "Upload failed";
			setPendingMedia((prev) =>
				prev.map((p) => (p.id === id ? { ...p, status: "failed", error } : p)),
			);
		}
	}

	function queueUploads(files: File[]) {
		if (!propertyId) return;
		const newPending: PendingMedia[] = files.map((file) => ({
			id: ++pendingIdRef.current,
			file,
			previewUrl: file.type.startsWith("image/")
				? URL.createObjectURL(file)
				: "",
			status: "uploading" as const,
		}));
		setPendingMedia((prev) => [...prev, ...newPending]);
		if (addInputRef.current) addInputRef.current.value = "";
		for (const item of newPending) {
			uploadSingle(item.id, item.file);
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		if (e.dataTransfer.files.length)
			queueUploads(Array.from(e.dataTransfer.files));
	};

	/* show empty-state only when nothing is pending either */
	if (media.length === 0 && pendingMedia.length === 0) {
		if (isOwner) {
			return (
				<label
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={handleDrop}
					className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center h-64 cursor-pointer transition-colors ${
						dragging
							? "border-primary bg-primary/10"
							: "border-border bg-surface-container hover:border-primary/40"
					}`}
				>
					<input
						type="file"
						accept="image/*,video/*,audio/*"
						multiple
						className="hidden"
						onChange={(e) => {
							if (e.target.files) queueUploads(Array.from(e.target.files));
						}}
					/>
					<ImagePlus className="w-10 h-10 text-outline mb-3" />
					<p className="text-sm font-medium text-on-surface-variant">
						Drag &amp; drop media here
					</p>
					<p className="text-xs text-outline mt-1">or click to browse files</p>
				</label>
			);
		}
		return (
			<div className="rounded-xl bg-surface-container flex flex-col items-center justify-center h-64">
				<ImagePlus className="w-10 h-10 text-outline mb-3" />
				<p className="text-on-surface-variant text-sm">No media available</p>
			</div>
		);
	}

	return (
		<>
			{/* Media items + pending placeholders + add button, top-left aligned */}
			<div className="flex flex-wrap items-start content-start gap-3">
				{media.map((item, idx) => (
					<button
						key={idx}
						type="button"
						className="inline-block max-w-sm cursor-pointer group overflow-hidden rounded-xl"
						onClick={() => setLightbox(idx)}
					>
						{item.type === MediaType.VIDEO ? (
							<div className="relative">
								<video
									src={item.url}
									className="w-full h-auto rounded-xl"
									muted
									preload="metadata"
								/>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="bg-black/50 rounded-full p-3">
										<Play className="w-8 h-8 text-white fill-white" />
									</div>
								</div>
							</div>
						) : item.type === MediaType.AUDIO ? (
							<div className="relative w-full h-40 rounded-xl bg-linear-to-br from-violet-600 to-indigo-800 flex flex-col items-center justify-center text-white">
								{item.thumbnail && (
									<Image
										src={item.thumbnail}
										alt={`${name} audio ${idx + 1}`}
										fill
										className="object-cover opacity-40 rounded-xl"
									/>
								)}
								<Mic className="w-10 h-10 relative z-1" />
								<span className="text-xs mt-2 relative z-1 font-medium text-center break-words px-10">
									{item.caption ?? "Audio"}
								</span>
							</div>
						) : (
							/* eslint-disable-next-line @next/next/no-img-element */
							<img
								src={item.url}
								alt={`${name} ${idx + 1}`}
								className="w-full h-auto rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
								loading={idx < 2 ? "eager" : "lazy"}
							/>
						)}
					</button>
				))}

				{/* Upload placeholders — one card per pending file */}
				{pendingMedia.map((item) => (
					<div
						key={item.id}
						className="relative w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-border bg-surface-container"
					>
						{item.previewUrl ? (
							/* eslint-disable-next-line @next/next/no-img-element */
							<img
								src={item.previewUrl}
								alt={item.file.name}
								className="w-full h-full object-cover opacity-60"
							/>
						) : item.file.type.startsWith("video/") ? (
							<div className="w-full h-full flex items-center justify-center">
								<Play className="w-8 h-8 text-outline" />
							</div>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Mic className="w-8 h-8 text-outline" />
							</div>
						)}
						<div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm px-2 py-1.5">
							<p className="text-badge font-medium text-on-surface truncate leading-tight">
								{item.file.name}
							</p>
							{item.status === "uploading" ? (
								<div className="flex items-center gap-1.5 mt-1">
									<div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
										<div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
									</div>
									<button
										type="button"
										onClick={() =>
											setPendingMedia((prev) =>
												prev.filter((p) => p.id !== item.id),
											)
										}
										className="text-[9px] text-red-500 hover:text-red-600 font-medium shrink-0"
									>
										Cancel
									</button>
								</div>
							) : (
								<>
									<p className="text-[9px] text-red-500 leading-tight mt-0.5 truncate">
										{item.error}
									</p>
									<div className="flex items-center gap-2 mt-0.5">
										<button
											type="button"
											onClick={() => {
												setPendingMedia((prev) =>
													prev.map((p) =>
														p.id === item.id
															? { ...p, status: "uploading", error: undefined }
															: p,
													),
												);
												uploadSingle(item.id, item.file);
											}}
											className="text-[9px] text-primary font-medium hover:underline flex items-center gap-0.5 shrink-0"
										>
											<Upload className="w-2.5 h-2.5" />
											Retry
										</button>
										<button
											type="button"
											onClick={() =>
												setPendingMedia((prev) =>
													prev.filter((p) => p.id !== item.id),
												)
											}
											className="text-[9px] text-outline hover:text-on-surface-variant shrink-0"
										>
											Dismiss
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				))}

				{/* Add media button — always visible for owner */}
				{isOwner && propertyId && (
					<label className="w-32 h-32 shrink-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-container/50 hover:bg-surface-container-high transition-colors cursor-pointer">
						<Plus className="w-5 h-5 text-outline" />
						<span className="text-badge text-outline mt-1">Add</span>
						<input
							ref={addInputRef}
							type="file"
							accept="image/*,video/*,audio/*"
							multiple
							className="hidden"
							onChange={(e) => {
								if (e.target.files) queueUploads(Array.from(e.target.files));
							}}
						/>
					</label>
				)}
			</div>

			{/* Lightbox */}
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

/* ─── Title Row (avatar + name + price) ──────────────────────── */

function TitleRow({
	property,
	actions,
}: {
	property: Property;
	actions?: React.ReactNode;
}) {
	const askingPrice =
		property.listingPrice ??
		property.currentValue ??
		property.purchasePrice ??
		0;
	return (
		<div className="flex flex-wrap items-start justify-between gap-4">
			{/* name */}
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<div className="min-w-0">
					<h1 className="font-headline text-xl font-bold text-on-surface truncate">
						{property.name}
					</h1>
				</div>
			</div>
			{/* Right: price */}
			<div className="flex items-center gap-3 shrink-0">
				<span className="font-headline text-2xl font-bold text-primary">
					{formatCurrency(askingPrice, property.country)}
				</span>
				{actions}
			</div>
		</div>
	);
}

/* ─── Description with See More ──────────────────────────────── */

function DescriptionBlock({ text }: { text: string }) {
	const [expanded, setExpanded] = useState(false);
	const isLong = text.length > 280;
	const visible = expanded ? text : text.slice(0, 280);

	return (
		<section>
			<h2 className="font-headline text-base font-semibold text-on-surface mb-2">
				Description
			</h2>
			<p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
				{visible}
				{isLong && !expanded && "… "}
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="font-semibold text-on-surface hover:underline"
					>
						{expanded ? "See Less" : "See More..."}
					</button>
				)}
			</p>
		</section>
	);
}

/* ─── Property Details Cards ─────────────────────────────────── */

function DetailCard({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}) {
	return (
		<div className="border border-border rounded-xl px-4 py-3 min-w-0 flex items-center gap-3">
			<Icon className="w-4 h-4 text-outline shrink-0" />
			<div className="min-w-0">
				<p className="text-xs text-outline truncate">{label}</p>
				<p className="text-sm font-semibold text-on-surface truncate">
					{value}
				</p>
			</div>
		</div>
	);
}

function PropertyDetails({ property }: { property: Property }) {
	const cards: {
		icon: React.ComponentType<{ className?: string }>;
		label: string;
		value: string;
	}[] = [];

	if (property.propertyType) {
		cards.push({
			icon: Building2,
			label: "Type",
			value: property.propertyType
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		});
	}
	if (property.area) {
		const sqft = Math.round(property.area * 10.7639);
		cards.push({
			icon: Ruler,
			label: "Area",
			value: `${sqft.toLocaleString()} sq ft`,
		});
	}
	if (property.bedrooms != null) {
		cards.push({
			icon: BedDouble,
			label: "Bedrooms",
			value: `${property.bedrooms}`,
		});
	}
	if (property.bathrooms != null) {
		cards.push({
			icon: Bath,
			label: "Bathrooms",
			value: `${property.bathrooms}`,
		});
	}
	if (property.parkingSpaces != null) {
		cards.push({
			icon: Car,
			label: "Parking",
			value: `${property.parkingSpaces} Spaces`,
		});
	}
	if (property.finishingType) {
		cards.push({
			icon: Sparkles,
			label: "Finishing",
			value: property.finishingType,
		});
	}
	if (property.projectName) {
		cards.push({
			icon: Landmark,
			label: "Project",
			value: property.projectName,
		});
	}
	if ((property.quantity ?? 1) > 1) {
		cards.push({ icon: Tag, label: "Units", value: `${property.quantity}` });
	}
	if (property.zoning) {
		cards.push({ icon: Shield, label: "Zoning", value: property.zoning });
	}
	(property.conditions ?? []).forEach((c) => {
		cards.push({
			icon: conditionIcon(c),
			label: "Condition",
			value: c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
		});
	});
	(property.amenities ?? []).forEach((a) => {
		cards.push({ icon: Sparkles, label: "Amenity", value: a });
	});

	if (cards.length === 0) return null;

	return (
		<section>
			<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
				Property Details
			</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{cards.map((c, i) => (
					<DetailCard
						key={`${c.label}-${i}`}
						icon={c.icon}
						label={c.label}
						value={c.value}
					/>
				))}
			</div>
		</section>
	);
}

function conditionIcon(
	condition: string,
): React.ComponentType<{ className?: string }> {
	switch (condition) {
		case "bush":
			return TreePine;
		case "fenced":
			return Fence;
		case "has_structure":
		case "finished":
		case "under_construction":
			return Home;
		default:
			return Shield;
	}
}

/* ─── Owner Sidebar Card ─────────────────────────────────────── */

function OwnerCard({ property }: { property: Property }) {
	const owner = property.owner;
	const yearsActive = owner?.joinDate
		? Math.max(
				1,
				new Date().getFullYear() - new Date(owner.joinDate).getFullYear(),
			)
		: null;

	return (
		<div className="bg-card border border-border rounded-md p-5 space-y-4">
			{/* Top row: avatar + name + rating */}
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-3 min-w-0">
					<UserAvatar
						name={owner?.name || "Unknown"}
						avatar={owner?.avatar}
						ownerId={owner?.id}
						size="lg"
					/>
					<div className="min-w-0">
						<Link
							href={`/profile/${owner?.id}`}
							className="font-headline text-sm font-semibold text-on-surface hover:underline truncate block"
						>
							{owner?.displayName || owner?.name || "Unknown"}
						</Link>
						{yearsActive && (
							<p className="text-xs text-outline">
								{yearsActive}+ Year{yearsActive > 1 ? "s" : ""} Active
							</p>
						)}
					</div>
				</div>
				{owner?.salesCount != null && owner.salesCount > 0 && (
					<div className="flex items-center gap-1 text-xs text-on-surface-variant shrink-0">
						<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
						<span className="font-medium">
							{owner.salesCount} sale{owner.salesCount !== 1 ? "s" : ""}
						</span>
					</div>
				)}
			</div>

			{/* Contact buttons */}
			<div className="flex gap-2">
				{owner?.phone && (
					<a
						href={`https://wa.me/${owner.phone.replace(/[^0-9]/g, "")}`}
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-sm font-semibold border-2 border-green-500 text-green-600 hover:bg-green-50 transition-colors"
					>
						<MessageCircle className="w-4 h-4" />
						Whatsapp
					</a>
				)}
				{owner?.phone && (
					<a
						href={`tel:${owner.phone}`}
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-sm font-semibold bg-on-surface text-card hover:opacity-90 transition-opacity"
					>
						<Phone className="w-4 h-4" />
						Call Owner
					</a>
				)}
				{!owner?.phone && owner?.email && (
					<a
						href={`mailto:${owner.email}`}
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
					>
						<Mail className="w-4 h-4" />
						Email Owner
					</a>
				)}
			</div>

			{/* Inclusions */}
			<InclusionsList property={property} />
		</div>
	);
}

/* ─── Inclusions List ────────────────────────────────────────── */

function InclusionsList({ property }: { property: Property }) {
	const docCount = property.documents?.length ?? 0;
	const hasSurvey = !!property.surveyData;
	const hasGrid = !!property.propertyGrid;

	const inclusions: { label: string; value: string }[] = [];

	if (docCount > 0) {
		inclusions.push({
			label: "Documents",
			value: `${docCount} file${docCount !== 1 ? "s" : ""} included`,
		});
	}
	if (hasSurvey) {
		inclusions.push({ label: "Survey Data", value: "Included" });
	}
	if (hasGrid) {
		inclusions.push({ label: "Property Grid", value: "Available" });
	}
	if (property.zoning) {
		inclusions.push({ label: "Zoning Info", value: property.zoning });
	}

	if (inclusions.length === 0) return null;

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-semibold text-on-surface">Inclusions</h3>
			<div className="space-y-1.5">
				{inclusions.map((inc) => (
					<div
						key={inc.label}
						className="flex items-center justify-between text-xs"
					>
						<span className="text-on-surface-variant">{inc.label}</span>
						<span className="text-on-surface font-medium">{inc.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/* ─── Price Breakdown Card ───────────────────────────────────── */

function PriceBreakdownCard({ property }: { property: Property }) {
	const askingPrice =
		property.listingPrice ??
		property.currentValue ??
		property.purchasePrice ??
		0;
	const purchasePrice = property.purchasePrice ?? 0;

	const items: { label: string; value: string; bold?: boolean }[] = [];

	if (property.soldPrice) {
		items.push({
			label: "Sold Price",
			value: formatCurrency(property.soldPrice, property.country),
			bold: true,
		});
	} else {
		items.push({
			label: property.listingPrice ? "Listing Price" : "Asking Price",
			value: formatCurrency(askingPrice, property.country),
			bold: true,
		});
	}

	if (property.listingPrice && property.soldPrice) {
		const spreadSign = property.soldPrice >= property.listingPrice ? "+" : "";
		const spread = property.soldPrice - property.listingPrice;
		items.push({
			label: "vs Listing",
			value: `${spreadSign}${formatCurrency(spread, property.country)}`,
		});
	}

	if (
		property.currentValue &&
		property.purchasePrice &&
		property.currentValue !== property.purchasePrice
	) {
		items.push({
			label: "Estimated Value",
			value: formatCurrency(property.currentValue, property.country),
		});
	}

	if (purchasePrice && purchasePrice !== askingPrice) {
		items.push({
			label: "Purchase Price",
			value: formatCurrency(purchasePrice, property.country),
		});
		const ref = property.soldPrice ?? property.currentValue;
		if (ref && ref !== purchasePrice) {
			const diff = ref - purchasePrice;
			items.push({
				label: diff >= 0 ? "Gain" : "Loss",
				value: formatCurrency(Math.abs(diff), property.country),
			});
		}
	}

	if ((property.quantity ?? 1) > 1) {
		const perUnit = askingPrice / (property.quantity ?? 1);
		items.push({
			label: "Price Per Unit",
			value: formatCurrency(perUnit, property.country),
		});
	}

	return (
		<div className="bg-card border border-border rounded-md p-5 space-y-3">
			<h3 className="font-headline text-sm font-semibold text-on-surface">
				Price Breakdown
			</h3>
			<div className="space-y-2">
				{items.map((item) => (
					<div
						key={item.label}
						className={`flex items-center justify-between text-sm ${item.bold ? "bg-surface-container-high rounded-sm px-3 py-2" : ""}`}
					>
						<span className="text-on-surface-variant">{item.label}</span>
						<span
							className={`font-semibold ${item.bold ? "text-on-surface" : "text-on-surface"}`}
						>
							{item.value}
						</span>
					</div>
				))}
			</div>
			<div className="border-t border-border pt-3 flex items-center justify-between">
				<span className="font-headline text-sm font-semibold text-on-surface">
					Total:
				</span>
				<span className="font-headline text-lg font-bold text-on-surface">
					{formatCurrency(askingPrice, property.country)}
				</span>
			</div>
		</div>
	);
}

/* ─── Property Insights Chart ────────────────────────────────── */

function PropertyInsightsChart({ property }: { property: Property }) {
	const pricePoints: { label: string; value: number; color: string }[] = [];

	if (property.purchasePrice) {
		pricePoints.push({
			label: "Purchase",
			value: property.purchasePrice,
			color: "#f472b6",
		});
	}
	if (
		property.currentValue &&
		property.currentValue !== property.purchasePrice
	) {
		pricePoints.push({
			label: "Est. Value",
			value: property.currentValue,
			color: "#60a5fa",
		});
	}
	if (property.listingPrice) {
		pricePoints.push({
			label: "Listing",
			value: property.listingPrice,
			color: "#fbbf24",
		});
	}
	if (property.soldPrice) {
		pricePoints.push({
			label: "Sold",
			value: property.soldPrice,
			color: "#34d399",
		});
	}

	const hasPriceChart = pricePoints.length >= 2;

	// ROI stat
	const refPrice = property.soldPrice ?? property.currentValue;
	const roiPct =
		refPrice && property.purchasePrice
			? ((refPrice - property.purchasePrice) / property.purchasePrice) * 100
			: null;

	// Price per sqm
	const pricePerSqm =
		(property.soldPrice ?? property.currentValue ?? property.purchasePrice) &&
		property.area
			? Math.round(
					(property.soldPrice ??
						property.currentValue ??
						property.purchasePrice ??
						0) / property.area,
				)
			: null;

	// Document coverage
	const docCount = property.documents?.length ?? 0;

	// Radial gauge data for ROI (capped at ±200%)
	const roiGaugeVal =
		roiPct != null ? Math.max(-100, Math.min(200, roiPct)) : null;
	const roiGaugeData =
		roiGaugeVal != null
			? [
					{
						value: Math.abs(roiGaugeVal),
						fill: roiGaugeVal >= 0 ? "#34d399" : "#f87171",
					},
				]
			: null;

	if (!hasPriceChart && roiPct == null && pricePerSqm == null) return null;

	const maxPrice = Math.max(...pricePoints.map((p) => p.value));

	return (
		<div className="space-y-5 max-w-xl">
			{/* Price Journey Chart */}
			{hasPriceChart && (
				<div>
					<p className="text-xs text-outline mb-3 uppercase tracking-wide font-label">
						Price Journey
					</p>
					<ResponsiveContainer
						width="100%"
						height={pricePoints.length * 44 + 16}
					>
						<BarChart
							layout="vertical"
							data={pricePoints}
							margin={{ left: 4, right: 24, top: 0, bottom: 0 }}
						>
							<XAxis type="number" hide domain={[0, maxPrice * 1.15]} />
							<YAxis
								type="category"
								dataKey="label"
								tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
								axisLine={false}
								tickLine={false}
								width={58}
							/>
							<Tooltip
								cursor={{ fill: "var(--color-surface-container)" }}
								contentStyle={{
									background: "var(--color-card)",
									border: "1px solid var(--color-border)",
									borderRadius: 8,
									fontSize: 12,
								}}
								formatter={(v: number) => [
									formatCurrency(v, property.country),
									"Value",
								]}
							/>
							<Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
								{pricePoints.map((entry, index) => (
									<Cell key={index} fill={entry.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>

					{/* Legend dots */}
					<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
						{pricePoints.map((p) => (
							<div key={p.label} className="flex items-center gap-1.5">
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ background: p.color }}
								/>
								<span className="text-xs text-on-surface-variant">
									{p.label}:{" "}
									<span className="font-medium text-on-surface">
										{formatCurrency(p.value, property.country)}
									</span>
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Stats row */}
			{(roiPct != null || pricePerSqm != null || docCount > 0) && (
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{/* ROI gauge */}
					{roiGaugeData && roiPct != null && (
						<div className="bg-surface-container rounded-xl p-3 flex flex-col items-center gap-1">
							<ResponsiveContainer width="100%" height={72}>
								<RadialBarChart
									innerRadius="55%"
									outerRadius="95%"
									startAngle={180}
									endAngle={0}
									data={roiGaugeData}
								>
									<RadialBar
										dataKey="value"
										cornerRadius={4}
										background={{ fill: "var(--color-surface-container-high)" }}
									/>
								</RadialBarChart>
							</ResponsiveContainer>
							<span
								className={`text-sm font-bold font-headline ${roiPct >= 0 ? "text-emerald-500" : "text-red-400"}`}
							>
								{roiPct >= 0 ? "+" : ""}
								{roiPct.toFixed(1)}%
							</span>
							<span className="text-xs text-outline">ROI</span>
						</div>
					)}

					{/* Price per sqm */}
					{pricePerSqm != null && (
						<div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center">
							<span className="text-lg font-headline font-bold text-on-surface">
								{pricePerSqm >= 1000
									? `${(pricePerSqm / 1000).toFixed(1)}K`
									: pricePerSqm.toLocaleString()}
							</span>
							<span className="text-xs text-outline">/ m² price</span>
						</div>
					)}

					{/* Document coverage */}
					{docCount > 0 && (
						<div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center">
							<span className="text-lg font-headline font-bold text-on-surface">
								{docCount}
							</span>
							<span className="text-xs text-outline">
								{docCount === 1 ? "Document" : "Documents"}
							</span>
						</div>
					)}

					{/* Area stat if available */}
					{property.area && (
						<div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center">
							<span className="text-lg font-headline font-bold text-on-surface">
								{property.area >= 10000
									? `${(property.area / 10000).toFixed(2)} ha`
									: `${property.area.toLocaleString()} m²`}
							</span>
							<span className="text-xs text-outline">Area</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/* ─── Schedule Viewing Card ──────────────────────────────────── */

function ScheduleViewingCard({ property }: { property: Property }) {
	const [selectedDate, setSelectedDate] = useState("");
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [bookingOpen, setBookingOpen] = useState(false);

	const today = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}, []);

	const daysInMonth = useMemo(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1).getDay();
		const total = new Date(year, month + 1, 0).getDate();
		return { firstDay, total, year, month };
	}, [currentMonth]);

	const monthLabel = currentMonth.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

	const prevMonth = useCallback(() => {
		setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
	}, []);

	const nextMonth = useCallback(() => {
		setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
	}, []);

	const selectDate = useCallback(
		(day: number) => {
			const d = new Date(daysInMonth.year, daysInMonth.month, day);
			if (d < today) return;
			const iso = d.toISOString().split("T")[0];
			setSelectedDate(iso);
			setBookingOpen(true);
		},
		[daysInMonth, today],
	);

	const isSelected = (day: number) => {
		const d = new Date(daysInMonth.year, daysInMonth.month, day)
			.toISOString()
			.split("T")[0];
		return d === selectedDate;
	};

	return (
		<div className="bg-card border border-border rounded-md p-5 space-y-4">
			<h3 className="font-headline text-sm font-semibold text-on-surface">
				Schedule a Viewing
			</h3>

			{/* Mini calendar */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<button
						type="button"
						onClick={prevMonth}
						className="p-1 rounded hover:bg-surface-container-high transition-colors"
					>
						<ChevronLeft className="w-4 h-4 text-on-surface-variant" />
					</button>
					<span className="text-sm font-semibold text-on-surface">
						{monthLabel}
					</span>
					<button
						type="button"
						onClick={nextMonth}
						className="p-1 rounded hover:bg-surface-container-high transition-colors"
					>
						<ChevronRight className="w-4 h-4 text-on-surface-variant" />
					</button>
				</div>
				<div className="grid grid-cols-7 text-center text-xs text-outline mb-1">
					{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
						<span key={`${d}-${i}`} className="py-1">
							{d}
						</span>
					))}
				</div>
				<div className="grid grid-cols-7 text-center text-xs">
					{Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
						<span key={`empty-${i}`} />
					))}
					{Array.from({ length: daysInMonth.total }).map((_, i) => {
						const day = i + 1;
						const d = new Date(daysInMonth.year, daysInMonth.month, day);
						const isPast = d < today;
						const selected = isSelected(day);

						return (
							<button
								key={day}
								type="button"
								disabled={isPast}
								onClick={() => selectDate(day)}
								className={`py-1.5 rounded-sm transition-colors ${
									isPast
										? "text-outline/40 cursor-not-allowed"
										: selected
											? "bg-on-surface text-card font-semibold"
											: "text-on-surface hover:bg-surface-container-high"
								}`}
							>
								{day}
							</button>
						);
					})}
				</div>
			</div>

			<p className="text-xs text-on-surface-variant text-center">
				Select a date to schedule a visit
			</p>

			{/* Booking modal */}
			<BookingModal
				open={bookingOpen}
				onClose={() => setBookingOpen(false)}
				property={property}
				selectedDate={selectedDate}
			/>
		</div>
	);
}

/* ─── Documents Section ──────────────────────────────────────── */

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
				<div className="text-xs text-on-surface-variant bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-sm px-3 py-2">
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

function MobileAccordionSection({
	title,
	open,
	onToggle,
	children,
	className,
	contentClassName = "p-4",
	rightAction,
}: {
	title: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
	rightAction?: React.ReactNode;
}) {
	return (
		<div
			className={`border-r border-b border-border rounded-none overflow-hidden ${className ?? ""}`}
		>
			<div className="w-full flex items-center justify-between px-4 py-3 bg-background text-on-surface font-semibold text-sm">
				<button type="button" onClick={onToggle} className="flex-1 text-left">
					{title}
				</button>
				<div className="flex items-center gap-3">
					{rightAction}
					<button type="button" onClick={onToggle} className="shrink-0">
						{open ? (
							<ChevronUp className="w-4 h-4" />
						) : (
							<ChevronDown className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>
			{open && <div className={contentClassName}>{children}</div>}
		</div>
	);
}

/* ─── Main Component ─────────────────────────────────────────── */

export interface PropertyFullViewProps {
	property: Property;
	actions?: React.ReactNode;
	accessRequests?: DocumentAccessRequest[];
	onAccessRequested?: (req: DocumentAccessRequest) => void;
	viewer?: { id: string; name: string; email: string };
	isOwner?: boolean;
	className?: string;
	/** Force single-column (mobile) layout regardless of viewport width */
	singleColumn?: boolean;
	/** Hide the title row (name + price) — useful when a parent already shows them */
	hideHeader?: boolean;
	/** Show the contract generator panel */
	showContractGenerator?: boolean;
	/** Called when contract generator is closed */
	onCloseContractGenerator?: () => void;
}

export default function PropertyFullView({
	property,
	actions,
	accessRequests,
	onAccessRequested,
	viewer,
	isOwner,
	className = "",
	singleColumn = false,
	hideHeader = false,
	showContractGenerator = false,
	onCloseContractGenerator,
}: PropertyFullViewProps) {
	const mediaItems = getPropertyMedia(property);
	const hasCoordinates =
		property.coordinates &&
		(property.coordinates.lat !== 0 || property.coordinates.lng !== 0);

	const locationText = [
		property.address,
		property.city,
		property.state,
		property.country,
	]
		.filter(Boolean)
		.join(", ");
	const detailsInitiallyOpen = !singleColumn;

	const [mediaOpen, setMediaOpen] = useState(detailsInitiallyOpen);
	const [docsOpen, setDocsOpen] = useState(detailsInitiallyOpen);
	const [linkedDocsOpen, setLinkedDocsOpen] = useState(detailsInitiallyOpen);
	const [overviewOpen, setOverviewOpen] = useState(detailsInitiallyOpen);
	const [mapOpen, setMapOpen] = useState(detailsInitiallyOpen);
	const [ownershipOpen, setOwnershipOpen] = useState(detailsInitiallyOpen);
	const [marketOpen, setMarketOpen] = useState(detailsInitiallyOpen);
	const [insightsOpen, setInsightsOpen] = useState(detailsInitiallyOpen);
	const [saleOpen, setSaleOpen] = useState(true);
	const [hasSale, setHasSale] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [propertySettings, setPropertySettings] = useState<PropertySettings>(
		property.settings ?? {},
	);
	const [mapModalOpen, setMapModalOpen] = useState(false);
	const updateProperty = useUpdateProperty();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [userSeals, setUserSeals] = useState<any[]>([]);

	// Fetch seals when contract generator opens
	const sealsFetched = useRef(false);
	const fetchSeals = useCallback(async () => {
		if (sealsFetched.current) return;
		sealsFetched.current = true;
		try {
			const res = await fetch("/api/settings/seal");
			if (res.ok) {
				const data = await res.json();
				setUserSeals(data.seals ?? []);
			}
		} catch {
			// ignore
		}
	}, []);

	if (showContractGenerator && !sealsFetched.current) {
		fetchSeals();
	}

	const twoCol = singleColumn ? "" : "lg:flex-row";
	const leftCol = singleColumn ? "hidden" : "hidden lg:block w-full lg:w-3/5";
	const rightCol = singleColumn ? "w-full" : "w-full lg:w-2/5 lg:border-l";
	const mobileOnly = singleColumn ? "" : "lg:hidden";
	const desktopOnly = singleColumn ? "hidden" : "hidden lg:block";
	const allDetailsOpen =
		overviewOpen &&
		ownershipOpen &&
		marketOpen &&
		insightsOpen &&
		(!hasCoordinates || mapOpen);

	const setDetailSectionsOpen = (open: boolean) => {
		setOverviewOpen(open);
		setOwnershipOpen(open);
		setMarketOpen(open);
		setInsightsOpen(open);
		if (hasCoordinates) {
			setMapOpen(open);
		}
	};

	return (
		<div className={`flex flex-col ${twoCol} h-full ${className}`}>
			{/* ─── Left column: Media + Docs (desktop only) ──────── */}
			<div className={`${leftCol} overflow-y-auto p-4 space-y-6`}>
				{showContractGenerator ? (
					<DocumentGenerator
						propertyId={property.id}
						propertyName={property.name}
						propertyAddress={property.address}
						ownerName={property.owner?.name ?? ""}
						ownerEmail={property.owner?.email}
						ownerPhone={property.owner?.phone}
						ownerType={property.owner?.type}
						seals={userSeals}
						onClose={() => onCloseContractGenerator?.()}
					/>
				) : (
					<>
						<MediaGallery
							media={mediaItems}
							name={property.name}
							isOwner={isOwner}
							propertyId={property.id}
						/>

						{/* Documents */}
						<DocumentsSection
							property={property}
							accessRequests={accessRequests}
							onAccessRequested={onAccessRequested}
							viewer={viewer}
							isOwner={isOwner}
						/>

						{/* Linked AI Documents */}
						{viewer?.id && (
							<LinkedDocumentsSection
								propertyId={property.id}
								userId={viewer.id}
								isOwner={isOwner}
							/>
						)}
					</>
				)}
			</div>

			{/* ─── Single column (mobile) / Right column (desktop) ── */}
			<div
				className={`${rightCol} overflow-y-auto p-0 space-y-0 border-border`}
			>
				{/* Active sale (auction / open offers) — visible to everyone */}
				{hasSale ? (
					<MobileAccordionSection
						title="Sale activity"
						open={saleOpen}
						onToggle={() => setSaleOpen(!saleOpen)}
					>
						<ActiveSalePanel
							propertyId={property.id}
							country={property.country}
							isOwner={isOwner}
							onSaleDetected={setHasSale}
						/>
					</MobileAccordionSection>
				) : (
					<div className="hidden">
						<ActiveSalePanel
							propertyId={property.id}
							country={property.country}
							isOwner={isOwner}
							onSaleDetected={setHasSale}
						/>
					</div>
				)}

				{/* Expandable Media section (mobile only) */}
				{mediaItems.length > 0 && (
					<MobileAccordionSection
						title={`Media (${mediaItems.length})`}
						open={mediaOpen}
						onToggle={() => setMediaOpen(!mediaOpen)}
						className={mobileOnly}
						contentClassName="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2"
					>
						{mediaItems.map((item, idx) => (
							<div key={idx} className="rounded-lg overflow-hidden">
								{item.type === MediaType.VIDEO ? (
									<div className="relative">
										<video
											src={item.url}
											className="w-full h-auto rounded-lg"
											muted
											preload="metadata"
										/>
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="bg-black/50 rounded-full p-2">
												<Play className="w-5 h-5 text-white fill-white" />
											</div>
										</div>
									</div>
								) : item.type === MediaType.AUDIO ? (
									<div className="h-24 bg-linear-to-br from-violet-600 to-indigo-800 rounded-lg flex flex-col items-center justify-center text-white">
										<Mic className="w-6 h-6" />
										<span className="text-xs mt-1">
											{item.caption ?? "Audio"}
										</span>
									</div>
								) : (
									/* eslint-disable-next-line @next/next/no-img-element */
									<img
										src={item.url}
										alt={`${property.name} ${idx + 1}`}
										className="w-full h-auto rounded-lg"
										loading="lazy"
									/>
								)}
							</div>
						))}
					</MobileAccordionSection>
				)}

				{/* Expandable Documents section (mobile only) */}
				{(property.documents?.length ?? 0) > 0 && (
					<MobileAccordionSection
						title={`Documents (${property.documents?.length})`}
						open={docsOpen}
						onToggle={() => setDocsOpen(!docsOpen)}
						className={mobileOnly}
						contentClassName="p-3"
					>
						<DocumentsSection
							property={property}
							accessRequests={accessRequests}
							onAccessRequested={onAccessRequested}
							viewer={viewer}
							isOwner={isOwner}
						/>
					</MobileAccordionSection>
				)}

				{/* Linked AI Documents (mobile) */}
				{viewer?.id && (
					<MobileAccordionSection
						title="Linked AI Documents"
						open={linkedDocsOpen}
						onToggle={() => setLinkedDocsOpen(!linkedDocsOpen)}
						className={mobileOnly}
					>
						<LinkedDocumentsSection
							propertyId={property.id}
							userId={viewer.id}
							isOwner={isOwner}
						/>
					</MobileAccordionSection>
				)}

				{/* Overview (mobile accordion) */}
				<MobileAccordionSection
					title="Overview"
					open={overviewOpen}
					onToggle={() => setOverviewOpen(!overviewOpen)}
					className={mobileOnly}
					rightAction={
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setDetailSectionsOpen(!allDetailsOpen);
							}}
							className="text-xs text-on-surface-variant hover:text-primary transition-colors"
						>
							{allDetailsOpen ? "Collapse All" : "Expand All"}
						</button>
					}
				>
					<div className="space-y-6">
						<div className="flex items-center gap-2 text-sm text-on-surface-variant">
							<MapPin className="w-4 h-4 shrink-0" />
							<span>{locationText || "Location not specified"}</span>
							{property.country && (
								<span className="text-base">
									{countryFlag(property.country)}
								</span>
							)}
						</div>

						{hasCoordinates && (
							<div className="flex items-center gap-2 text-sm">
								<Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
								<span className="font-mono text-primary font-semibold tracking-wide">
									{toPlotWords(
										property.coordinates.lat,
										property.coordinates.lng,
									)}
								</span>
								<button
									type="button"
									className="text-outline hover:text-on-surface transition-colors"
									title="Copy PlotWords code"
									onClick={() => {
										navigator.clipboard.writeText(
											toPlotWords(
												property.coordinates.lat,
												property.coordinates.lng,
											),
										);
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-3.5 h-3.5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<rect x="9" y="9" width="13" height="13" rx="2" />
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
									</svg>
								</button>
							</div>
						)}

						{!hideHeader && <TitleRow property={property} actions={actions} />}
						{property.description && (
							<DescriptionBlock text={property.description} />
						)}
						<PropertyDetails property={property} />

						{!hideHeader && (
							<div className="text-xs text-outline space-y-1 px-1">
								{property.createdAt && (
									<p className="mb-4">
										Listed:{" "}
										<span className="text-on-surface font-medium">
											{formatDate(property.createdAt)}
										</span>
									</p>
								)}
								{property.status && (
									<div className="flex items-center gap-2">
										{isOwner ? (
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
										) : (
											<span
												className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
											>
												{property.status.replace(/_/g, " ").toUpperCase()}
											</span>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</MobileAccordionSection>

				{/* Map (mobile accordion) */}
				{hasCoordinates && (
					<MobileAccordionSection
						title="Location"
						open={mapOpen}
						onToggle={() => setMapOpen(!mapOpen)}
						className={mobileOnly}
						contentClassName="p-0"
						rightAction={
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setMapModalOpen(true);
								}}
								className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
							>
								<Expand className="w-3.5 h-3.5" />
								Expand
							</button>
						}
					>
						<PropertyMiniMap
							lat={property.coordinates.lat}
							lng={property.coordinates.lng}
							propertyName={property.name}
							showHeader={false}
							frameless
							showCoordinates={false}
							collapsedHeightClassName="h-80"
						/>
					</MobileAccordionSection>
				)}

				{/* Ownership transfers & history (mobile accordion) */}
				<MobileAccordionSection
					title="Ownership & Transfers"
					open={ownershipOpen}
					onToggle={() => setOwnershipOpen(!ownershipOpen)}
					className={mobileOnly}
				>
					<OwnershipPanel property={property} showHeader={false} />
				</MobileAccordionSection>

				{/* Property Settings (owner only, mobile) */}
				{isOwner && (
					<MobileAccordionSection
						title="Property Settings"
						open={settingsOpen}
						onToggle={() => setSettingsOpen(!settingsOpen)}
						className={mobileOnly}
					>
						<PropertySettingsPanel
							property={{ ...property, settings: propertySettings }}
							onSettingsChanged={setPropertySettings}
						/>
					</MobileAccordionSection>
				)}

				{/* Property Insights (mobile accordion, owner only) */}
				{isOwner && (
					<MobileAccordionSection
						title="Property Insights"
						open={insightsOpen}
						onToggle={() => setInsightsOpen(!insightsOpen)}
						className={mobileOnly}
					>
						<PropertyInsightsChart property={property} />
					</MobileAccordionSection>
				)}

				{/* Owner / Price / Schedule (mobile accordion) */}
				<MobileAccordionSection
					title="Pricing & Contacts"
					open={marketOpen}
					onToggle={() => setMarketOpen(!marketOpen)}
					className={mobileOnly}
				>
					<MasonryGrid minColWidth={250} gap={16}>
						{!isOwner && <OwnerCard property={property} />}
						<PriceBreakdownCard property={property} />
						{!isOwner && <ScheduleViewingCard property={property} />}
					</MasonryGrid>
				</MobileAccordionSection>

				<div className={desktopOnly}>
					<MobileAccordionSection
						title="Overview"
						open={overviewOpen}
						onToggle={() => setOverviewOpen(!overviewOpen)}
						rightAction={
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setDetailSectionsOpen(!allDetailsOpen);
								}}
								className="text-xs text-on-surface-variant hover:text-primary transition-colors"
							>
								{allDetailsOpen ? "Collapse All" : "Expand All"}
							</button>
						}
					>
						<div className="space-y-6">
							<div className="flex items-center gap-2 text-sm text-on-surface-variant">
								<MapPin className="w-4 h-4 shrink-0" />
								<span>{locationText || "Location not specified"}</span>
								{property.country && (
									<span className="text-base">
										{countryFlag(property.country)}
									</span>
								)}
							</div>

							{hasCoordinates && (
								<div className="flex items-center gap-2 text-sm">
									<Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
									<span className="font-mono text-primary font-semibold tracking-wide">
										{toPlotWords(
											property.coordinates.lat,
											property.coordinates.lng,
										)}
									</span>
									<button
										type="button"
										className="text-outline hover:text-on-surface transition-colors"
										title="Copy PlotWords code"
										onClick={() => {
											navigator.clipboard.writeText(
												toPlotWords(
													property.coordinates.lat,
													property.coordinates.lng,
												),
											);
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="w-3.5 h-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<rect x="9" y="9" width="13" height="13" rx="2" />
											<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
										</svg>
									</button>
								</div>
							)}

							{!hideHeader && (
								<TitleRow property={property} actions={actions} />
							)}
							{property.description && (
								<DescriptionBlock text={property.description} />
							)}
							<PropertyDetails property={property} />

							{!hideHeader && (
								<div className="text-xs text-outline space-y-1 px-1">
									{property.createdAt && (
										<p className="mb-4">
											Listed:{" "}
											<span className="text-on-surface font-medium">
												{formatDate(property.createdAt)}
											</span>
										</p>
									)}
									{property.status && (
										<div className="flex items-center gap-2">
											{isOwner ? (
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
											) : (
												<span
													className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
												>
													{property.status.replace(/_/g, " ").toUpperCase()}
												</span>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					</MobileAccordionSection>

					{hasCoordinates && (
						<MobileAccordionSection
							title="Location"
							open={mapOpen}
							onToggle={() => setMapOpen(!mapOpen)}
							contentClassName="p-0"
							rightAction={
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setMapModalOpen(true);
									}}
									className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
								>
									<Expand className="w-3.5 h-3.5" />
									Expand
								</button>
							}
						>
							<PropertyMiniMap
								lat={property.coordinates.lat}
								lng={property.coordinates.lng}
								propertyName={property.name}
								showHeader={false}
								frameless
								showCoordinates={false}
								collapsedHeightClassName="h-80"
							/>
						</MobileAccordionSection>
					)}

					<MobileAccordionSection
						title="Ownership & Transfers"
						open={ownershipOpen}
						onToggle={() => setOwnershipOpen(!ownershipOpen)}
					>
						<OwnershipPanel property={property} showHeader={false} />
					</MobileAccordionSection>

					{/* Property Settings (owner only, desktop) */}
					{isOwner && (
						<MobileAccordionSection
							title="Property Settings"
							open={settingsOpen}
							onToggle={() => setSettingsOpen(!settingsOpen)}
						>
							<PropertySettingsPanel
								property={{ ...property, settings: propertySettings }}
								onSettingsChanged={setPropertySettings}
							/>
						</MobileAccordionSection>
					)}

					{isOwner && (
						<MobileAccordionSection
							title="Property Insights"
							open={insightsOpen}
							onToggle={() => setInsightsOpen(!insightsOpen)}
						>
							<PropertyInsightsChart property={property} />
						</MobileAccordionSection>
					)}

					<MobileAccordionSection
						title="Pricing & Contacts"
						open={marketOpen}
						onToggle={() => setMarketOpen(!marketOpen)}
					>
						<MasonryGrid minColWidth={250} gap={16}>
							{!isOwner && <OwnerCard property={property} />}
							<PriceBreakdownCard property={property} />
							{!isOwner && <ScheduleViewingCard property={property} />}
						</MasonryGrid>
					</MobileAccordionSection>
				</div>

				{mapModalOpen && hasCoordinates && (
					<div
						className="fixed inset-x-0 bottom-0 top-16 z-50 bg-black/65 p-4 sm:p-6"
						onClick={() => setMapModalOpen(false)}
					>
						<div
							className="mx-auto flex h-full max-w-7xl w-full flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
								<div>
									<p className="text-sm font-semibold text-on-surface">
										Location Map
									</p>
									<p className="text-xs text-on-surface-variant">
										{property.name}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setMapModalOpen(false)}
									className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-on-surface-variant hover:bg-surface-container-high transition-colors"
									aria-label="Close map modal"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="flex-1 min-h-0">
								<PropertyMiniMap
									lat={property.coordinates.lat}
									lng={property.coordinates.lng}
									propertyName={property.name}
									showHeader={false}
									frameless
									showCoordinates={false}
									expanded
									expandedHeightClassName="h-[calc(100vh-8rem)]"
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
