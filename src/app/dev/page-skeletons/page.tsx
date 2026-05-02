"use client";

import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import {
	AnalyticsPageSkeleton,
	CreatePropertyFormSkeleton,
	DashboardSkeleton,
	DocumentsPageSkeleton,
	FormSkeleton,
	MapPageSkeleton,
	MarketplaceCardSkeleton,
	MarketplacePageSkeleton,
	PageHero,
	PropertiesPageSkeleton,
	PropertyDetailSkeleton,
	PropertyGridSkeleton,
	SummaryStatRowSkeleton,
	TableRowsSkeleton,
	ToolbarSkeleton,
} from "@/components/ui/skeletons";
import { BarChart3, FileText, Heart, Home, Plus, Send } from "lucide-react";
import { useState } from "react";

/* ── Per-page wrappers — each mirrors what the route's `loading.tsx`
 *    renders so the gallery preview matches reality (real titles + chrome).
 * ──────────────────────────────────────────────────────────────────────── */

function DashboardWrapped() {
	return <DashboardSkeleton />;
}

function PropertiesPageWrapped() {
	return (
		<PropertiesPageSkeleton
			header={
				<PageHero
					icon={Home}
					title="My Properties"
					description="Manage your properties — documents, valuations, and transaction records"
				/>
			}
		/>
	);
}

function DocumentsPageWrapped() {
	return (
		<DocumentsPageSkeleton
			header={
				<PageHero
					icon={FileText}
					title="My Documents"
					description="Upload, manage, and organise your property documents"
				/>
			}
		/>
	);
}

function AnalyticsPageWrapped() {
	return (
		<AnalyticsPageSkeleton
			header={
				<PageHero
					icon={BarChart3}
					title="Analytics"
					description="Portfolio performance, distribution, and insights"
				/>
			}
		/>
	);
}

function MarketplacePageWrapped() {
	return <MarketplacePageSkeleton />;
}

function MapPageWrapped() {
	return <MapPageSkeleton />;
}

function PropertyDetailWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 z-10">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Properties" />
					<span className="text-outline-variant hidden sm:inline">/</span>
					<div className="skeleton h-4 w-32 rounded-md" />
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				<PropertyDetailSkeleton />
			</div>
		</div>
	);
}

function CreatePropertyWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Properties" />
					<span className="text-outline">/</span>
					<div className="skeleton h-4 w-40 rounded-md" />
				</div>
			</div>
			<CreatePropertyFormSkeleton />
		</div>
	);
}

function EditPropertyWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Back" />
					<span className="text-outline hidden sm:inline">/</span>
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-headline text-base sm:text-lg font-bold text-on-surface">
							Edit:
						</span>
						<div className="skeleton h-4 w-40 rounded-md" />
					</div>
				</div>
			</div>
			<CreatePropertyFormSkeleton />
		</div>
	);
}

function TransfersPageWrapped() {
	return (
		<div className="sz-page max-w-3xl space-y-5">
			<div className="flex items-center gap-3 mb-2">
				<Send className="w-6 h-6 text-primary" />
				<div>
					<h1 className="font-headline text-lg font-semibold text-on-surface">
						Transfers
					</h1>
					<p className="text-sm text-on-surface-variant">
						Ownership transfers sent to or received by you
					</p>
				</div>
			</div>
			<TableRowsSkeleton rows={6} columns={5} />
		</div>
	);
}

function TeamPageWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio" label="Dashboard" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface truncate">
						Team
					</h1>
				</div>
			</div>
			<div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-16 max-w-3xl space-y-5">
				<TableRowsSkeleton rows={6} columns={4} />
			</div>
		</div>
	);
}

function AllPortfoliosPageWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center justify-between gap-4">
					<h1 className="font-headline text-lg font-bold text-on-surface truncate">
						Portfolios
					</h1>
					<PrimaryButton href="/portfolio/new">
						<Plus className="w-4 h-4" />
						New portfolio
					</PrimaryButton>
				</div>
			</div>
			<div className="px-4 sm:px-8 pt-6 pb-16 space-y-5">
				<ToolbarSkeleton filterCount={1} />
				<PropertyGridSkeleton count={8} />
			</div>
		</div>
	);
}

function NewPortfolioPageWrapped() {
	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/portfolio" label="Dashboard" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						New Portfolio
					</h1>
				</div>
			</div>
			<div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-16 max-w-lg">
				<FormSkeleton rows={5} />
			</div>
		</div>
	);
}

function SettingsPageWrapped() {
	return (
		<div className="sz-page">
			<h1 className="font-headline typo-page-title font-bold text-on-surface mb-1">
				Settings
			</h1>
			<p className="typo-body text-on-surface-variant mb-6">
				Manage your account, appearance, and preferences.
			</p>
			<div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
				<aside className="w-full md:w-56 shrink-0 space-y-1">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="skeleton h-8 w-full rounded-md" />
					))}
				</aside>
				<div className="flex-1 min-w-0 w-full max-w-2xl">
					<FormSkeleton rows={6} />
				</div>
			</div>
		</div>
	);
}

function FavouritesPageWrapped() {
	return (
		<div className="sz-page max-w-6xl space-y-5">
			<div className="mb-2">
				<div className="flex items-center gap-3 mb-2">
					<Heart className="w-6 h-6 text-red-500" />
					<h1 className="text-2xl font-bold font-headline text-on-surface">
						Favourites
					</h1>
				</div>
				<div className="skeleton h-3 w-32 rounded-md" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<MarketplaceCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

function AdminPageWrapped() {
	return (
		<div className="sz-page space-y-5">
			<h1 className="font-headline text-sm font-semibold text-primary">
				Admin
			</h1>
			<SummaryStatRowSkeleton count={4} />
			<TableRowsSkeleton rows={8} columns={5} />
		</div>
	);
}

const PAGE_SKELETONS: {
	name: string;
	route: string;
	Comp: () => React.ReactElement;
	fullHeight?: boolean;
}[] = [
	{ name: "Dashboard", route: "/portfolio", Comp: DashboardWrapped },
	{
		name: "Properties",
		route: "/portfolio/properties",
		Comp: PropertiesPageWrapped,
	},
	{
		name: "Map",
		route: "/portfolio/map",
		Comp: MapPageWrapped,
		fullHeight: true,
	},
	{
		name: "Documents",
		route: "/portfolio/documents",
		Comp: DocumentsPageWrapped,
	},
	{
		name: "Analytics",
		route: "/portfolio/analytics",
		Comp: AnalyticsPageWrapped,
	},
	{ name: "Marketplace", route: "/marketplace", Comp: MarketplacePageWrapped },
	{
		name: "Favourites",
		route: "/marketplace/favourites",
		Comp: FavouritesPageWrapped,
	},
	{
		name: "Property Detail",
		route: "/portfolio/properties/[id]",
		Comp: PropertyDetailWrapped,
		fullHeight: true,
	},
	{
		name: "New Property",
		route: "/portfolio/properties/new",
		Comp: CreatePropertyWrapped,
		fullHeight: true,
	},
	{
		name: "Edit Property",
		route: "/portfolio/properties/[id]/edit",
		Comp: EditPropertyWrapped,
		fullHeight: true,
	},
	{
		name: "Transfers",
		route: "/portfolio/transfers",
		Comp: TransfersPageWrapped,
	},
	{
		name: "Team",
		route: "/portfolio/team",
		Comp: TeamPageWrapped,
		fullHeight: true,
	},
	{
		name: "All Portfolios",
		route: "/portfolio/all",
		Comp: AllPortfoliosPageWrapped,
		fullHeight: true,
	},
	{
		name: "New Portfolio",
		route: "/portfolio/new",
		Comp: NewPortfolioPageWrapped,
		fullHeight: true,
	},
	{ name: "Settings", route: "/settings", Comp: SettingsPageWrapped },
	{ name: "Admin", route: "/admin", Comp: AdminPageWrapped },
];

export default function PageSkeletonsGallery() {
	const [activeIndex, setActiveIndex] = useState(0);
	const active = PAGE_SKELETONS[activeIndex];
	const Comp = active.Comp;

	return (
		<AppShell scrollable={!active.fullHeight}>
			<div className="flex flex-col h-full min-h-0">
				{/* Selector bar */}
				<div className="flex items-center gap-2 flex-wrap p-3 border-b border-border bg-card sticky top-0 z-20">
					<span className="text-xs uppercase tracking-wider font-mono text-outline mr-2">
						Page Skeleton:
					</span>
					{PAGE_SKELETONS.map((p, i) => (
						<button
							key={p.name}
							onClick={() => setActiveIndex(i)}
							className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors ${
								i === activeIndex
									? "bg-blue-600 text-white border-blue-600"
									: "bg-card text-on-surface-variant border-border hover:bg-surface-container"
							}`}
							title={p.route}
						>
							{p.name}
						</button>
					))}
				</div>

				{/* Render area */}
				<div
					className={
						active.fullHeight
							? "flex-1 min-h-0"
							: "flex-1 min-h-0 overflow-auto"
					}
				>
					<Comp />
				</div>
			</div>
		</AppShell>
	);
}
