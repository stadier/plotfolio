"use client";

import MediaLightbox from "@/components/property/MediaLightbox";
import {
	DocumentsGrid,
	formatDate,
	getStatusColor,
} from "@/components/property/propertyDisplayHelpers";
import MasonryGrid from "@/components/ui/MasonryGrid";
import UserAvatar from "@/components/ui/UserAvatar";
import { countryFlag } from "@/lib/locale";
import { formatCurrency, getPropertyMedia } from "@/lib/utils";
import {
	DocumentAccessRequest,
	MediaType,
	Property,
	PropertyMedia,
} from "@/types/property";
import {
	Bath,
	BedDouble,
	Building2,
	Calendar,
	Car,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
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
	Ruler,
	Shield,
	Sparkles,
	Star,
	Tag,
	TreePine,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

const PropertyMiniMap = dynamic(
	() => import("@/components/maps/PropertyMiniMap"),
	{ ssr: false },
);

/* ─── Media Gallery (masonry, natural aspect ratios) ─────────── */

function MediaGallery({
	media,
	name,
	isOwner,
	onMediaUploaded,
}: {
	media: PropertyMedia[];
	name: string;
	isOwner?: boolean;
	onMediaUploaded?: (files: File[]) => void;
}) {
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFiles = (files: FileList | null) => {
		if (!files || !onMediaUploaded) return;
		onMediaUploaded(Array.from(files));
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		handleFiles(e.dataTransfer.files);
	};

	if (media.length === 0) {
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
						onChange={(e) => handleFiles(e.target.files)}
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
			{/* Natural-size media items, top-left aligned */}
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
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
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

/* ─── Property Specification Grid ────────────────────────────── */

function SpecCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-border rounded-xl px-4 py-3 text-center min-w-0">
			<p className="text-xs text-outline mb-1 truncate">{label}</p>
			<p className="text-sm font-semibold text-on-surface truncate">{value}</p>
		</div>
	);
}

function PropertySpecs({ property }: { property: Property }) {
	const areaInSqm = property.area ?? 0;
	const areaInSqft = Math.round(areaInSqm * 10.7639);

	const specs: { label: string; value: string }[] = [];

	if (areaInSqft > 0) {
		specs.push({
			label: "Area",
			value: `${areaInSqft.toLocaleString()} sq ft`,
		});
	}
	if (property.propertyType) {
		specs.push({
			label: "Type",
			value: property.propertyType
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		});
	}
	if (property.bedrooms != null) {
		specs.push({ label: "Bedrooms", value: `${property.bedrooms}` });
	}
	if (property.bathrooms != null) {
		specs.push({ label: "Bathrooms", value: `${property.bathrooms}` });
	}
	if (property.parkingSpaces != null) {
		specs.push({ label: "Parking", value: `${property.parkingSpaces} Spaces` });
	}
	if (property.finishingType) {
		specs.push({ label: "Finishing", value: property.finishingType });
	}
	if (property.conditions?.length && property.conditions.length > 0) {
		specs.push({
			label: "Condition",
			value: property.conditions[0]
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		});
	}
	if (property.zoning) {
		specs.push({ label: "Zoning", value: property.zoning });
	}

	if (specs.length === 0) return null;

	return (
		<section>
			<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
				Property Specification
			</h2>
			<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
				{specs.map((s) => (
					<SpecCard key={s.label} label={s.label} value={s.value} />
				))}
			</div>
		</section>
	);
}

/* ─── Property Features (two sub-cards) ──────────────────────── */

function FeatureItem({
	icon: Icon,
	label,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	return (
		<span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
			<Icon className="w-4 h-4 text-outline shrink-0" />
			{label}
		</span>
	);
}

function PropertyFeatures({ property }: { property: Property }) {
	const technicalFeatures: {
		icon: React.ComponentType<{ className?: string }>;
		label: string;
	}[] = [];
	const additionalFeatures: {
		icon: React.ComponentType<{ className?: string }>;
		label: string;
	}[] = [];

	// Technical features (from property details)
	if (property.propertyType) {
		technicalFeatures.push({
			icon: Building2,
			label: property.propertyType
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		});
	}
	if (property.bedrooms != null) {
		technicalFeatures.push({
			icon: BedDouble,
			label: `${property.bedrooms} Bedrooms`,
		});
	}
	if (property.bathrooms != null) {
		technicalFeatures.push({
			icon: Bath,
			label: `${property.bathrooms} Bathrooms`,
		});
	}
	if (property.parkingSpaces != null) {
		technicalFeatures.push({
			icon: Car,
			label: `${property.parkingSpaces} Parking`,
		});
	}
	if (property.projectName) {
		technicalFeatures.push({ icon: Landmark, label: property.projectName });
	}
	if (property.area) {
		const sqft = Math.round(property.area * 10.7639);
		technicalFeatures.push({
			icon: Ruler,
			label: `${sqft.toLocaleString()} sq ft`,
		});
	}
	if ((property.quantity ?? 1) > 1) {
		technicalFeatures.push({ icon: Tag, label: `${property.quantity} Units` });
	}

	// Additional features (amenities + conditions)
	(property.amenities ?? []).forEach((a) => {
		additionalFeatures.push({ icon: Sparkles, label: a });
	});
	(property.conditions ?? []).forEach((c) => {
		const label = c
			.replace(/_/g, " ")
			.replace(/\b\w/g, (ch) => ch.toUpperCase());
		additionalFeatures.push({ icon: conditionIcon(c), label });
	});

	if (technicalFeatures.length === 0 && additionalFeatures.length === 0)
		return null;

	return (
		<section>
			<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
				Property Features
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{technicalFeatures.length > 0 && (
					<div className="border border-border rounded-xl p-4 space-y-3 max-w-md">
						<h3 className="text-sm font-semibold text-on-surface">
							Property Details
						</h3>
						<div className="grid grid-cols-2 gap-y-2 gap-x-4">
							{technicalFeatures.map((f) => (
								<FeatureItem key={f.label} icon={f.icon} label={f.label} />
							))}
						</div>
					</div>
				)}
				{additionalFeatures.length > 0 && (
					<div className="border border-border rounded-xl p-4 space-y-3 max-w-md">
						<h3 className="text-sm font-semibold text-on-surface">
							Conditions
						</h3>
						<div className="grid grid-cols-2 gap-y-2 gap-x-4">
							{additionalFeatures.map((f) => (
								<FeatureItem key={f.label} icon={f.icon} label={f.label} />
							))}
						</div>
					</div>
				)}
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
		<div className="bg-card border border-border rounded-2xl p-5 space-y-4">
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
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border-2 border-green-500 text-green-600 hover:bg-green-50 transition-colors"
					>
						<MessageCircle className="w-4 h-4" />
						Whatsapp
					</a>
				)}
				{owner?.phone && (
					<a
						href={`tel:${owner.phone}`}
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-on-surface text-card hover:opacity-90 transition-opacity"
					>
						<Phone className="w-4 h-4" />
						Call Owner
					</a>
				)}
				{!owner?.phone && owner?.email && (
					<a
						href={`mailto:${owner.email}`}
						className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
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
	const askingPrice = property.currentValue ?? property.purchasePrice ?? 0;
	const purchasePrice = property.purchasePrice ?? 0;

	const items: { label: string; value: string; bold?: boolean }[] = [];

	items.push({
		label: "Asking Price",
		value: formatCurrency(askingPrice, property.country),
		bold: true,
	});

	if (
		property.currentValue &&
		property.purchasePrice &&
		property.currentValue !== property.purchasePrice
	) {
		items.push({
			label: "Original Price",
			value: formatCurrency(purchasePrice, property.country),
		});
		const diff = property.currentValue - property.purchasePrice;
		items.push({
			label: diff >= 0 ? "Value Increase" : "Value Decrease",
			value: formatCurrency(Math.abs(diff), property.country),
		});
	}

	if ((property.quantity ?? 1) > 1) {
		const perUnit = askingPrice / (property.quantity ?? 1);
		items.push({
			label: "Price Per Unit",
			value: formatCurrency(perUnit, property.country),
		});
	}

	return (
		<div className="bg-card border border-border rounded-2xl p-5 space-y-3">
			<h3 className="font-headline text-sm font-semibold text-on-surface">
				Price Breakdown
			</h3>
			<div className="space-y-2">
				{items.map((item) => (
					<div
						key={item.label}
						className={`flex items-center justify-between text-sm ${item.bold ? "bg-surface-container-high rounded-lg px-3 py-2" : ""}`}
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

/* ─── Schedule Viewing Card ──────────────────────────────────── */

function ScheduleViewingCard({ property }: { property: Property }) {
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [currentMonth, setCurrentMonth] = useState(new Date());

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
			if (!startDate || (startDate && endDate)) {
				setStartDate(iso);
				setEndDate("");
			} else {
				if (iso < startDate) {
					setEndDate(startDate);
					setStartDate(iso);
				} else {
					setEndDate(iso);
				}
			}
		},
		[daysInMonth, startDate, endDate, today],
	);

	const formatDisplayDate = (iso: string) => {
		if (!iso) return "";
		const d = new Date(iso + "T00:00:00");
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "2-digit",
			year: "numeric",
		});
	};

	const isInRange = (day: number) => {
		if (!startDate || !endDate) return false;
		const d = new Date(daysInMonth.year, daysInMonth.month, day)
			.toISOString()
			.split("T")[0];
		return d >= startDate && d <= endDate;
	};

	const isSelected = (day: number) => {
		const d = new Date(daysInMonth.year, daysInMonth.month, day)
			.toISOString()
			.split("T")[0];
		return d === startDate || d === endDate;
	};

	return (
		<div className="bg-card border border-border rounded-2xl p-5 space-y-4">
			<h3 className="font-headline text-sm font-semibold text-on-surface">
				{property.owner?.allowBookings
					? "Schedule a Viewing"
					: "View Availability"}
			</h3>

			{/* Date range inputs */}
			<div className="flex items-center gap-2">
				<div className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-on-surface">
					{startDate ? formatDisplayDate(startDate) : "Start Date"}
				</div>
				<span className="text-outline">–</span>
				<div className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-on-surface">
					{endDate ? formatDisplayDate(endDate) : "End Date"}
				</div>
			</div>

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
						const inRange = isInRange(day);

						return (
							<button
								key={day}
								type="button"
								disabled={isPast}
								onClick={() => selectDate(day)}
								className={`py-1.5 rounded-md transition-colors ${
									isPast
										? "text-outline/40 cursor-not-allowed"
										: selected
											? "bg-on-surface text-card font-semibold"
											: inRange
												? "bg-surface-container-high text-on-surface"
												: "text-on-surface hover:bg-surface-container-high"
								}`}
							>
								{day}
							</button>
						);
					})}
				</div>
			</div>

			{/* Book button */}
			{property.owner?.allowBookings && (
				<Link
					href={`/profile/${property.owner?.id}`}
					className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
				>
					<Calendar className="w-4 h-4" />
					Schedule Visit
				</Link>
			)}
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

export interface PropertyFullViewProps {
	property: Property;
	actions?: React.ReactNode;
	accessRequests?: DocumentAccessRequest[];
	onAccessRequested?: (req: DocumentAccessRequest) => void;
	viewer?: { id: string; name: string; email: string };
	isOwner?: boolean;
	className?: string;
}

export default function PropertyFullView({
	property,
	actions,
	accessRequests,
	onAccessRequested,
	viewer,
	isOwner,
	className = "",
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

	const [mediaOpen, setMediaOpen] = useState(false);
	const [docsOpen, setDocsOpen] = useState(false);

	return (
		<div className={`flex flex-col lg:flex-row h-full ${className}`}>
			{/* ─── Left column: Media + Docs (desktop only) ──────── */}
			<div className="hidden lg:block w-full lg:w-3/5 overflow-y-auto p-4 space-y-6">
				<MediaGallery
					media={mediaItems}
					name={property.name}
					isOwner={isOwner}
				/>

				{/* Documents */}
				<DocumentsSection
					property={property}
					accessRequests={accessRequests}
					onAccessRequested={onAccessRequested}
					viewer={viewer}
					isOwner={isOwner}
				/>
			</div>

			{/* ─── Single column (mobile) / Right column (desktop) ── */}
			<div className="w-full lg:w-2/5 overflow-y-auto p-4 space-y-6 lg:border-l border-border">
				{/* Expandable Media section (mobile only) */}
				{mediaItems.length > 0 && (
					<div className="lg:hidden border border-border rounded-xl overflow-hidden">
						<button
							type="button"
							onClick={() => setMediaOpen(!mediaOpen)}
							className="w-full flex items-center justify-between px-4 py-3 bg-card text-on-surface font-semibold text-sm"
						>
							<span>Media ({mediaItems.length})</span>
							{mediaOpen ? (
								<ChevronUp className="w-4 h-4" />
							) : (
								<ChevronDown className="w-4 h-4" />
							)}
						</button>
						{mediaOpen && (
							<div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
							</div>
						)}
					</div>
				)}

				{/* Expandable Documents section (mobile only) */}
				{(property.documents?.length ?? 0) > 0 && (
					<div className="lg:hidden border border-border rounded-xl overflow-hidden">
						<button
							type="button"
							onClick={() => setDocsOpen(!docsOpen)}
							className="w-full flex items-center justify-between px-4 py-3 bg-card text-on-surface font-semibold text-sm"
						>
							<span>Documents ({property.documents?.length})</span>
							{docsOpen ? (
								<ChevronUp className="w-4 h-4" />
							) : (
								<ChevronDown className="w-4 h-4" />
							)}
						</button>
						{docsOpen && (
							<div className="p-3">
								<DocumentsSection
									property={property}
									accessRequests={accessRequests}
									onAccessRequested={onAccessRequested}
									viewer={viewer}
									isOwner={isOwner}
								/>
							</div>
						)}
					</div>
				)}

				{/* Location bar */}
				<div className="flex items-center gap-2 text-sm text-on-surface-variant">
					<MapPin className="w-4 h-4 shrink-0" />
					<span>{locationText || "Location not specified"}</span>
					{property.country && (
						<span className="text-base">{countryFlag(property.country)}</span>
					)}
				</div>

				{/* Title row */}
				<TitleRow property={property} actions={actions} />

				{/* Description */}
				{property.description && (
					<DescriptionBlock text={property.description} />
				)}

				{/* Property Specification */}
				<PropertySpecs property={property} />

				{/* Property Features */}
				<PropertyFeatures property={property} />

				{/* Map */}
				{hasCoordinates && (
					<PropertyMiniMap
						lat={property.coordinates.lat}
						lng={property.coordinates.lng}
						propertyName={property.name}
					/>
				)}

				{/* Owner / Price / Schedule — masonry grid */}
				<MasonryGrid minColWidth={250} gap={16}>
					{!isOwner && <OwnerCard property={property} />}
					<PriceBreakdownCard property={property} />
					{!isOwner && <ScheduleViewingCard property={property} />}
				</MasonryGrid>

				{/* Listing meta */}
				<div className="text-xs text-outline space-y-1 px-1">
					{property.createdAt && (
						<p>
							Listed:{" "}
							<span className="text-on-surface font-medium">
								{formatDate(property.createdAt)}
							</span>
						</p>
					)}
					{property.status && (
						<p>
							Status:{" "}
							<span
								className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}
							>
								{property.status.replace(/_/g, " ").toUpperCase()}
							</span>
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
