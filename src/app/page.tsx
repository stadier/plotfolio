"use client";

import AppShell from "@/components/layout/AppShell";
import PropertyDrawer from "@/components/property/PropertyDrawer";
import { PropertyAPI } from "@/lib/api";
import { Property, PropertyStatus, PropertyType } from "@/types/property";
import {
	LayoutGrid,
	List,
	MapPin,
	Search,
	SlidersHorizontal,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyFull(amount: number) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: 0,
	}).format(amount);
}

function formatCurrencyCompact(amount: number) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		minimumFractionDigits: 0,
		notation: "compact",
		compactDisplay: "short",
	}).format(amount);
}

function getStatusBadge(status: PropertyStatus) {
	switch (status) {
		case PropertyStatus.OWNED:
			return { label: "Owned", cls: "bg-secondary text-white" };
		case PropertyStatus.FOR_SALE:
			return { label: "For Sale", cls: "bg-primary text-white" };
		case PropertyStatus.DEVELOPMENT:
			return { label: "Development", cls: "bg-amber-500 text-white" };
		case PropertyStatus.UNDER_CONTRACT:
			return { label: "Under Contract", cls: "bg-orange-500 text-white" };
		case PropertyStatus.RENTED:
			return { label: "Rented", cls: "bg-purple-600 text-white" };
		default:
			return {
				label: (status as string).replace(/_/g, " "),
				cls: "bg-slate-500 text-white",
			};
	}
}

const CARD_GRADIENTS = [
	"bg-linear-to-br from-[#000e24] to-[#00234b]",
	"bg-linear-to-br from-[#1a3a2a] to-[#3b6934]",
	"bg-linear-to-br from-[#1a2638] to-[#2c4771]",
	"bg-linear-to-br from-[#17252c] to-[#3a4950]",
	"bg-linear-to-br from-[#2d1b00] to-[#7a3f00]",
	"bg-linear-to-br from-[#2a0a2e] to-[#6b2f7e]",
];

// ── Feature card (large, 8/12 columns) ───────────────────────────────────────

function FeatureCard({
	property,
	gradientClass,
	onSelect,
}: {
	property: Property;
	gradientClass: string;
	onSelect: (id: string) => void;
}) {
	const badge = getStatusBadge(property.status);
	const worth = property.currentValue ?? property.purchasePrice;

	return (
		<div
			onClick={() => onSelect(property.id)}
			className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent hover:border-outline-variant/20 cursor-pointer"
		>
			<div className={`relative h-[380px] ${gradientClass} overflow-hidden`}>
				<div className="absolute inset-0 flex items-center justify-center opacity-10">
					<MapPin className="w-48 h-48 text-white" />
				</div>
				<div className="absolute top-6 left-6 flex gap-2">
					<span
						className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}
					>
						{badge.label}
					</span>
					<span className="bg-white/80 backdrop-blur-md text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
						{property.area.toLocaleString()} sqm
					</span>
				</div>
			</div>
			<div className="p-8 flex justify-between items-center">
				<div>
					<h3 className="font-headline text-2xl font-bold tracking-tight text-primary mb-1">
						{property.name}
					</h3>
					<p className="text-on-surface-variant text-sm flex items-center gap-1">
						<MapPin className="w-3 h-3 shrink-0" />
						{property.address}
					</p>
				</div>
				<div className="text-right">
					<p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
						{property.currentValue ? "Current Worth" : "Purchase Price"}
					</p>
					<p className="font-headline text-3xl font-extrabold text-primary">
						{formatCurrencyFull(worth)}
					</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onSelect(property.id);
						}}
						className="mt-4 signature-gradient text-white px-8 py-3 rounded-md font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
					>
						View Details
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Small card (4/12 columns) ─────────────────────────────────────────────────

function PropertyCard({
	property,
	gradientClass,
	onSelect,
}: {
	property: Property;
	gradientClass: string;
	onSelect: (id: string) => void;
}) {
	const badge = getStatusBadge(property.status);
	const worth = property.currentValue ?? property.purchasePrice;

	return (
		<div
			onClick={() => onSelect(property.id)}
			className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-transparent hover:border-outline-variant/20"
		>
			<div className={`relative h-[220px] ${gradientClass} overflow-hidden`}>
				<div className="absolute inset-0 flex items-center justify-center opacity-10">
					<MapPin className="w-28 h-28 text-white" />
				</div>
				<div className="absolute top-4 left-4">
					<span
						className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}
					>
						{badge.label}
					</span>
				</div>
			</div>
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div className="min-w-0">
						<h3 className="font-headline text-base font-bold tracking-tight text-primary truncate">
							{property.name}
						</h3>
						<p className="text-on-surface-variant text-xs mt-0.5 truncate">
							{property.address}
						</p>
					</div>
					<span className="text-primary font-bold text-sm ml-2 shrink-0">
						{property.area.toLocaleString()} sqm
					</span>
				</div>
				<div className="flex items-center justify-between pt-4 border-t border-slate-100">
					<p className="font-headline text-xl font-extrabold text-primary">
						{formatCurrencyFull(worth)}
					</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onSelect(property.id);
						}}
						className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
					>
						View
					</button>
				</div>
			</div>
		</div>
	);
}

function CompactPropertyCard({
	property,
	gradientClass,
	onSelect,
}: {
	property: Property;
	gradientClass: string;
	onSelect: (id: string) => void;
}) {
	const badge = getStatusBadge(property.status);
	const worth = property.currentValue ?? property.purchasePrice;

	return (
		<div
			onClick={() => onSelect(property.id)}
			className="group h-full bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-transparent hover:border-outline-variant/20 flex flex-col"
		>
			<div
				className={`relative min-h-[280px] flex-1 ${gradientClass} overflow-hidden`}
			>
				<div className="absolute inset-0 flex items-center justify-center opacity-10">
					<MapPin className="w-24 h-24 text-white" />
				</div>
				<div className="absolute top-4 left-4">
					<span
						className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}
					>
						{badge.label}
					</span>
				</div>
			</div>
			<div className="p-5">
				<div className="flex items-start justify-between gap-4 mb-4">
					<div className="min-w-0">
						<h3 className="font-headline text-lg font-bold tracking-tight text-primary truncate">
							{property.name}
						</h3>
						<p className="text-on-surface-variant text-xs mt-1 truncate">
							{property.address}
						</p>
					</div>
					<span className="text-primary font-bold text-sm shrink-0">
						{property.area.toLocaleString()} sqm
					</span>
				</div>
				<div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
					<p className="font-headline text-2xl font-extrabold text-primary truncate">
						{formatCurrencyFull(worth)}
					</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onSelect(property.id);
						}}
						className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-md font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform shrink-0"
					>
						View
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
	const [properties, setProperties] = useState<Property[]>([]);
	const [filtered, setFiltered] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				let data = await PropertyAPI.getAllProperties();
				if (data.length === 0) {
					await PropertyAPI.seedDatabase();
					data = await PropertyAPI.getAllProperties();
				}
				setProperties(data);
				setFiltered(data);
			} catch {
				// api error – handled silently
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	useEffect(() => {
		const q = search.toLowerCase();
		const results = properties.filter((p) => {
			const matchesSearch =
				!q ||
				p.name.toLowerCase().includes(q) ||
				p.address.toLowerCase().includes(q);
			const matchesType =
				typeFilter === "all" ||
				p.propertyType.toLowerCase() === typeFilter.toLowerCase();
			return matchesSearch && matchesType;
		});
		setFiltered(results);
	}, [search, typeFilter, properties]);

	const totalWorth = properties.reduce(
		(sum, p) => sum + (p.currentValue ?? p.purchasePrice),
		0,
	);
	const totalArea = properties.reduce((s, p) => s + p.area, 0);
	const docCount = properties.reduce(
		(s, p) => s + (p.documents?.length ?? 0),
		0,
	);

	const [featureProperty, ...restProperties] = filtered;
	const topRailProperties = restProperties.slice(0, 1);
	const gridProperties = restProperties.slice(1);

	return (
		<AppShell>
			<div className="px-8 py-8">
				{/* Search & filter bar */}
				<div className="glass-search p-5 rounded-xl shadow-sm mb-10 flex flex-wrap items-center gap-5">
					<div className="flex-1 min-w-[260px] relative">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search by property name or location…"
							className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-md py-3 pl-11 pr-4 focus:ring-primary focus:ring-2 transition-all font-body text-sm outline-none"
						/>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex flex-col">
							<label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
								Property Type
							</label>
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								className="bg-surface-container-lowest border-none ring-1 ring-outline-variant/20 rounded-md py-2 px-4 text-xs font-semibold focus:ring-primary outline-none"
							>
								<option value="all">All Types</option>
								{Object.values(PropertyType).map((t) => (
									<option key={t} value={t}>
										{t.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</div>
						<button className="mt-5 flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary hover:bg-slate-100 rounded-md transition-all">
							<SlidersHorizontal className="w-4 h-4" />
							More Filters
						</button>
					</div>
				</div>

				{/* Page header */}
				<div className="mb-10 flex justify-between items-end">
					<div>
						<h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
							My Property Portfolio
						</h1>
						<p className="text-on-surface-variant font-body">
							{loading
								? "Loading your properties…"
								: `${properties.length} plot${properties.length !== 1 ? "s" : ""} · Total worth ${formatCurrencyCompact(totalWorth)} · ${totalArea.toLocaleString()} sqm`}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex gap-2">
							<button className="p-2 bg-surface-container-lowest shadow-sm rounded-md text-primary">
								<LayoutGrid className="w-5 h-5" />
							</button>
							<button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-md">
								<List className="w-5 h-5" />
							</button>
						</div>
						<Link
							href="/properties"
							className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-md shadow active:scale-95 transition-transform"
						>
							All Properties
						</Link>
					</div>
				</div>

				{/* Stats summary row */}
				{!loading && properties.length > 0 && (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
						{[
							{
								label: "Total Properties",
								value: String(properties.length),
								sub: "plots in portfolio",
							},
							{
								label: "Portfolio Worth",
								value: formatCurrencyCompact(totalWorth),
								sub: "current valuation",
							},
							{
								label: "Total Land Area",
								value: `${totalArea.toLocaleString()} sqm`,
								sub: "across all plots",
							},
							{
								label: "Documents Filed",
								value: String(docCount),
								sub: "contracts & surveys",
							},
						].map((stat) => (
							<div
								key={stat.label}
								className="bg-surface-container-lowest rounded-xl border border-slate-100 p-5 shadow-sm"
							>
								<div className="flex items-center gap-2 mb-2">
									<TrendingUp className="w-4 h-4 text-secondary" />
									<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
										{stat.label}
									</span>
								</div>
								<div className="font-headline text-2xl font-extrabold text-primary">
									{stat.value}
								</div>
								<div className="text-[10px] text-slate-400 mt-0.5">
									{stat.sub}
								</div>
							</div>
						))}
					</div>
				)}

				{/* Loading skeleton */}
				{loading && (
					<div className="space-y-8">
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
							<div className="lg:col-span-8 h-[500px] bg-white rounded-xl animate-pulse" />
							<div className="lg:col-span-4">
								<div className="h-[500px] bg-white rounded-xl animate-pulse" />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
							<div className="h-[340px] bg-white rounded-xl animate-pulse" />
						</div>
					</div>
				)}

				{/* Empty state */}
				{!loading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<MapPin className="w-14 h-14 text-slate-200 mb-4" />
						<h3 className="font-headline text-xl font-bold text-primary mb-2">
							{search ? "No results found" : "No properties yet"}
						</h3>
						<p className="text-on-surface-variant text-sm mb-6">
							{search
								? "Try adjusting your search or filters."
								: "Add your first property to start managing your portfolio."}
						</p>
						<Link
							href="/properties"
							className="signature-gradient text-white font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-full active:scale-95 transition-transform"
						>
							Add Property
						</Link>
					</div>
				)}

				{/* Property grid */}
				{!loading && filtered.length > 0 && (
					<div className="space-y-8">
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
							<div className="lg:col-span-8">
								<FeatureCard
									property={featureProperty}
									gradientClass={CARD_GRADIENTS[0]}
									onSelect={setSelectedId}
								/>
							</div>
							{topRailProperties.length > 0 && (
								<div className="lg:col-span-4 h-full">
									{topRailProperties.map((property, idx) => (
										<CompactPropertyCard
											key={property.id}
											property={property}
											gradientClass={
												CARD_GRADIENTS[(idx + 1) % CARD_GRADIENTS.length]
											}
											onSelect={setSelectedId}
										/>
									))}
								</div>
							)}
						</div>
						{gridProperties.length > 0 && (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
								{gridProperties.map((property, idx) => (
									<PropertyCard
										key={property.id}
										property={property}
										gradientClass={
											CARD_GRADIENTS[(idx + 3) % CARD_GRADIENTS.length]
										}
										onSelect={setSelectedId}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Load more / see all */}
				{!loading && filtered.length > 0 && (
					<div className="mt-16 flex flex-col items-center gap-4">
						<Link
							href="/properties"
							className="bg-surface-container-lowest border border-outline-variant/30 text-primary px-12 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:shadow-md transition-all"
						>
							View All Properties
						</Link>
						<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
							Showing {filtered.length} propert
							{filtered.length !== 1 ? "ies" : "y"}
						</p>
					</div>
				)}
			</div>

			{/* Floating Map button */}
			<Link
				href="/map"
				className="fixed bottom-8 right-8 signature-gradient text-white flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl z-40 hover:scale-105 transition-transform"
			>
				<MapPin className="w-5 h-5" />
				<span className="font-headline font-bold text-xs uppercase tracking-widest">
					Interactive Map
				</span>
			</Link>

			{/* Slide-in property drawer */}
			<PropertyDrawer
				propertyId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</AppShell>
	);
}
