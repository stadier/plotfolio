"use client";

import AppShell from "@/components/layout/AppShell";
import UserAvatar from "@/components/ui/UserAvatar";
import { formatArea, formatCurrency, getPropertyImageUrls } from "@/lib/utils";
import {
	Property,
	PropertyCondition,
	PropertyOwner,
	PropertyStatus,
} from "@/types/property";
import {
	ArrowLeft,
	Building2,
	Calendar,
	DollarSign,
	Eye,
	Globe,
	Mail,
	MapPin,
	Phone,
	Ruler,
	Shield,
	ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

/* ─── types ───────────────────────────────────────────────────── */

interface ProfileData {
	owner: PropertyOwner;
	stats: {
		totalProperties: number;
		publicCount: number;
		listedCount: number;
		totalValue: number;
		totalArea: number;
		salesCount: number;
	};
	properties: Property[]; // public properties
}

/* ─── helpers ─────────────────────────────────────────────────── */

const conditionLabels: Record<string, string> = {
	[PropertyCondition.BUSH]: "Bush",
	[PropertyCondition.CLEARED]: "Cleared",
	[PropertyCondition.FOUNDATION]: "Foundation",
	[PropertyCondition.HAS_STRUCTURE]: "Has Structure",
	[PropertyCondition.FENCED]: "Fenced",
	[PropertyCondition.PAVED]: "Paved",
	[PropertyCondition.WATERLOGGED]: "Waterlogged",
	[PropertyCondition.ROCKY]: "Rocky",
	[PropertyCondition.UNDER_CONSTRUCTION]: "Under Construction",
	[PropertyCondition.FINISHED]: "Finished",
	[PropertyCondition.RENOVATED]: "Renovated",
	[PropertyCondition.NEEDS_REPAIR]: "Needs Repair",
};

const statusLabels: Record<string, { label: string; color: string }> = {
	[PropertyStatus.FOR_SALE]: {
		label: "For Sale",
		color: "bg-green-500/15 text-green-700 dark:text-green-400",
	},
	[PropertyStatus.RENTED]: {
		label: "Rented",
		color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
	},
	[PropertyStatus.OWNED]: {
		label: "Showcase",
		color: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
	},
	[PropertyStatus.DEVELOPMENT]: {
		label: "Development",
		color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
	},
	[PropertyStatus.UNDER_CONTRACT]: {
		label: "Under Contract",
		color: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
	},
};

function getTypeLabel(type: string): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJoinDate(iso?: string): string {
	if (!iso) return "—";
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
	}).format(new Date(iso));
}

/* ─── stat pill ───────────────────────────────────────────────── */

function StatPill({ value, label }: { value: string; label: string }) {
	return (
		<div className="bg-surface-container-low dark:bg-surface-container rounded-xl px-4 py-3 min-w-[100px]">
			<p className="text-lg font-extrabold font-headline text-on-surface">
				{value}
			</p>
			<p className="text-[11px] text-on-surface-variant mt-0.5">{label}</p>
		</div>
	);
}

/* ─── public property card ────────────────────────────────────── */

function PublicPropertyCard({ property }: { property: Property }) {
	const price = property.currentValue || property.purchasePrice || 0;
	const heroImage = getPropertyImageUrls(property)[0];
	const status =
		statusLabels[property.status] || statusLabels[PropertyStatus.OWNED];

	return (
		<Link
			href={`/marketplace/${property.id}`}
			className="max-w-sm block rounded-xl border border-border bg-card overflow-hidden hover:border-gray-300 dark:hover:border-outline transition-colors group"
		>
			{/* Image */}
			<div className="h-32 bg-gray-100 dark:bg-surface-container relative">
				{heroImage ? (
					<Image
						src={heroImage}
						alt={property.name}
						fill
						className="object-cover"
						sizes="(max-width: 384px) 100vw, 384px"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Building2 className="w-10 h-10 text-gray-300 dark:text-on-surface-variant" />
					</div>
				)}
				{/* Status badge */}
				<span
					className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}
				>
					{status.label}
				</span>
			</div>

			{/* Details */}
			<div className="p-3.5">
				<h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
					{property.name}
				</h4>

				<div className="flex items-center gap-1 text-xs text-on-surface-variant mt-1">
					<MapPin className="w-3 h-3 shrink-0" />
					<span className="truncate">
						{property.city
							? `${property.city}, ${property.state || property.country || ""}`
							: property.address || "No location"}
					</span>
				</div>

				<div className="flex items-center gap-3 mt-2">
					{price > 0 && (
						<span className="text-sm font-bold text-primary">
							{formatCurrency(price)}
						</span>
					)}
					{property.area > 0 && (
						<span className="flex items-center gap-1 text-xs text-on-surface-variant">
							<Ruler className="w-3 h-3" />
							{formatArea(property.area)}
						</span>
					)}
				</div>

				{/* Type + conditions */}
				<div className="flex flex-wrap items-center gap-1.5 mt-2">
					<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-surface-container text-on-surface-variant">
						{getTypeLabel(property.propertyType)}
					</span>
					{property.conditions?.slice(0, 2).map((cond) => (
						<span
							key={cond}
							className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-surface-container text-on-surface-variant"
						>
							{conditionLabels[cond] || cond}
						</span>
					))}
				</div>
			</div>
		</Link>
	);
}

/* ─── profile sidebar ─────────────────────────────────────────── */

function ProfileSidebar({
	owner,
	stats,
}: {
	owner: PropertyOwner;
	stats: ProfileData["stats"];
}) {
	return (
		<div className="max-w-xs w-full">
			{/* Banner + Avatar */}
			<div className="rounded-xl overflow-hidden bg-card border border-border">
				<div className="h-24 relative bg-gray-200 dark:bg-surface-container">
					{owner.banner ? (
						<Image
							src={owner.banner}
							alt=""
							fill
							className="object-cover"
							sizes="320px"
						/>
					) : (
						<div className="w-full h-full bg-linear-to-br from-primary/20 to-secondary/20" />
					)}
				</div>

				<div className="px-4 pb-4">
					{/* Avatar overlapping banner */}
					<div className="-mt-6 mb-2">
						<div className="w-14 h-14 rounded-full border-3 border-white dark:border-surface-container-low overflow-hidden">
							<UserAvatar
								name={owner.name}
								displayName={owner.displayName}
								username={owner.username}
								avatar={owner.avatar}
								size="lg"
								className="w-14 h-14 [&>img]:w-14 [&>img]:h-14 [&>div]:w-14 [&>div]:h-14"
							/>
						</div>
					</div>

					{/* Name + badge */}
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-base font-bold text-on-surface">
							{owner.displayName || owner.name}
						</h1>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 dark:bg-primary/20 text-primary">
							{owner.type}
						</span>
					</div>

					{owner.username && (
						<p className="text-xs text-on-surface-variant mt-0.5">
							@{owner.username}
						</p>
					)}

					{/* Join date */}
					{owner.joinDate && (
						<div className="flex items-center gap-1 text-xs text-on-surface-variant mt-2">
							<Calendar className="w-3 h-3" />
							Joined {formatJoinDate(owner.joinDate)}
						</div>
					)}

					{/* Contact info */}
					<div className="mt-3 space-y-1.5">
						{owner.email && (
							<div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
								<Mail className="w-3.5 h-3.5 shrink-0" />
								<span className="truncate">{owner.email}</span>
							</div>
						)}
						{owner.phone && (
							<div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
								<Phone className="w-3.5 h-3.5 shrink-0" />
								<span>{owner.phone}</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Portfolio Summary */}
			<div className="mt-3 rounded-xl bg-card border border-border p-4">
				<h3 className="text-xs font-bold text-on-surface mb-3 uppercase tracking-wider">
					Portfolio Summary
				</h3>
				<div className="space-y-2.5">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
							<Building2 className="w-3.5 h-3.5" />
							Properties
						</span>
						<span className="text-xs font-bold text-on-surface">
							{stats.totalProperties}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
							<Eye className="w-3.5 h-3.5" />
							Public
						</span>
						<span className="text-xs font-bold text-on-surface">
							{stats.publicCount}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
							<ShoppingCart className="w-3.5 h-3.5" />
							For Sale
						</span>
						<span className="text-xs font-bold text-on-surface">
							{stats.listedCount}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
							<DollarSign className="w-3.5 h-3.5" />
							Sales Made
						</span>
						<span className="text-xs font-bold text-on-surface">
							{stats.salesCount}
						</span>
					</div>
				</div>
			</div>

			{/* Contact actions */}
			<div className="mt-3 flex gap-2">
				<button className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity">
					Contact
				</button>
				<button className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-on-surface hover:bg-gray-50 dark:hover:bg-surface-container transition-colors">
					Share Profile
				</button>
			</div>
		</div>
	);
}

/* ─── page ────────────────────────────────────────────────────── */

export default function ProfilePage() {
	const { id } = useParams<{ id: string }>();
	const [data, setData] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
				if (!res.ok) {
					throw new Error(
						res.status === 404 ? "Owner not found" : "Failed to load profile",
					);
				}
				setData(await res.json());
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	return (
		<AppShell>
			<div className="px-6 py-6">
				{/* Back link */}
				<Link
					href="/portfolio"
					className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary font-medium mb-6 transition-colors"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
					Back
				</Link>

				{/* Loading */}
				{loading && (
					<div className="flex gap-6">
						<div className="max-w-xs w-full space-y-3 animate-pulse">
							<div className="h-48 bg-gray-200 dark:bg-surface-container rounded-xl" />
							<div className="h-36 bg-gray-200 dark:bg-surface-container rounded-xl" />
						</div>
						<div className="flex-1 space-y-4 animate-pulse">
							<div className="flex gap-3">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-16 w-28 bg-gray-200 dark:bg-surface-container rounded-xl"
									/>
								))}
							</div>
							<div className="grid grid-cols-2 gap-4">
								{[1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-44 bg-gray-200 dark:bg-surface-container rounded-xl"
									/>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="text-center py-16">
						<p className="text-sm text-red-500 mb-3">{error}</p>
						<Link
							href="/portfolio"
							className="text-xs text-primary hover:underline font-medium"
						>
							Return to portfolio
						</Link>
					</div>
				)}

				{/* Profile content — two-column layout */}
				{!loading && !error && data && (
					<div className="flex gap-6 items-start">
						{/* Left: Profile sidebar */}
						<ProfileSidebar owner={data.owner} stats={data.stats} />

						{/* Right: Stats + public properties */}
						<div className="flex-1 min-w-0 max-w-3xl">
							{/* Stat pills row */}
							<div className="flex flex-wrap gap-3 mb-6">
								<StatPill
									value={String(data.stats.publicCount)}
									label="Public Properties"
								/>
								<StatPill
									value={
										data.stats.totalValue > 0
											? formatCurrency(data.stats.totalValue)
											: "—"
									}
									label="Portfolio Value"
								/>
								<StatPill
									value={
										data.stats.totalArea > 0
											? formatArea(data.stats.totalArea)
											: "—"
									}
									label="Total Area"
								/>
								<StatPill
									value={String(data.stats.salesCount)}
									label="Sales Made"
								/>
							</div>

							{/* Public properties */}
							<div>
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
										<Globe className="w-4 h-4 text-on-surface-variant" />
										Public Properties
									</h2>
									<span className="text-[11px] text-on-surface-variant">
										{data.stats.publicCount} visible
									</span>
								</div>

								{data.properties.length === 0 ? (
									<div className="rounded-xl border border-dashed border-border py-12 px-6 text-center">
										<Shield className="w-8 h-8 text-on-surface-variant mx-auto mb-2 opacity-50" />
										<p className="text-sm text-on-surface-variant">
											No public properties yet.
										</p>
										<p className="text-xs text-on-surface-variant/70 mt-1">
											Properties marked as public or listed for sale will appear
											here.
										</p>
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{data.properties.map((property) => (
											<PublicPropertyCard
												key={property.id}
												property={property}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</AppShell>
	);
}
