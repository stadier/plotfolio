"use client";

import { useRequireAuth } from "@/components/AuthContext";
import CalendarWidget from "@/components/dashboard/CalendarWidget";
import EngagementWidgets from "@/components/dashboard/EngagementWidgets";
import MiniMapWidget from "@/components/dashboard/MiniMapWidget";
import PortfolioHealthWidget from "@/components/dashboard/PortfolioHealthWidget";
import PropertySlideshowWidget from "@/components/dashboard/PropertySlideshowWidget";
import RecentDocumentsWidget from "@/components/dashboard/RecentDocumentsWidget";
import StatusDistributionWidget from "@/components/dashboard/StatusDistributionWidget";
import ValueTrendWidget from "@/components/dashboard/ValueTrendWidget";
import AppShell from "@/components/layout/AppShell";
import { usePortfolio } from "@/components/PortfolioContext";
import PropertyDrawer from "@/components/property/PropertyDrawer";
import {
	MetricGridSkeleton,
	PageHeadingSkeleton,
} from "@/components/ui/skeletons";
import useAnimateOnce from "@/hooks/useAnimateOnce";
import { useMyProperties, useOwnerBookings } from "@/hooks/usePropertyQueries";
import { PropertyAPI } from "@/lib/api";
import { formatCurrencyCompact } from "@/lib/utils";
import {
	Building2,
	FileText,
	Loader2,
	MapPin,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

// ── Stat card used only in this dashboard ─────────────────────────────────────

interface StatCardProps {
	label: string;
	value: string;
	icon: React.ReactNode;
	accent: string; // tailwind bg class for the icon circle
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
	return (
		<div className="bg-card sz-card border border-border flex items-center gap-3 max-w-xs widget-card animate-fade-in-up py-3!">
			<div
				className={`sz-icon-box-lg rounded-full ${accent} flex items-center justify-center shrink-0 max-sm:hidden`}
			>
				{icon}
			</div>
			<div className="min-w-0">
				<p className="typo-caption font-semibold text-outline uppercase tracking-widest leading-tight">
					{label}
				</p>
				<p className="font-headline text-base sm:typo-stat font-extrabold text-primary truncate">
					{value}
				</p>
			</div>
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardV2Page() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { user, loading: authLoading } = useRequireAuth();
	const { activePortfolio } = usePortfolio();
	const animate = useAnimateOnce("dashboard-v2");
	const { data: properties = [], isLoading: loading } = useMyProperties(
		user?.id,
		activePortfolio?.id,
		activePortfolio?.createdBy === user?.id,
	);
	const { data: bookings = [] } = useOwnerBookings(user?.id);

	// Fetch AI document count
	const [aiDocCount, setAiDocCount] = useState(0);
	useEffect(() => {
		if (!user?.id) return;
		PropertyAPI.listDocuments({ userId: user.id }).then((docs) =>
			setAiDocCount(docs.length),
		);
	}, [user?.id]);

	if (authLoading || !user) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
				</div>
			</AppShell>
		);
	}

	const totalWorth = properties.reduce(
		(sum, p) => sum + (p.currentValue || p.purchasePrice || 0),
		0,
	);
	const roiSummary = properties.reduce(
		(acc, p) => {
			if (!p.purchasePrice || p.purchasePrice <= 0) return acc;
			const referenceValue = p.soldPrice ?? p.currentValue ?? p.purchasePrice;
			return {
				invested: acc.invested + p.purchasePrice,
				reference: acc.reference + referenceValue,
			};
		},
		{ invested: 0, reference: 0 },
	);
	const roiPct =
		roiSummary.invested > 0
			? ((roiSummary.reference - roiSummary.invested) / roiSummary.invested) *
				100
			: null;
	const roiValue =
		roiPct == null ? "N/A" : `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(1)}%`;
	const roiAccent =
		roiPct != null && roiPct < 0
			? "bg-rose-50 dark:bg-rose-500/20"
			: "bg-emerald-50 dark:bg-emerald-500/20";
	const totalArea = properties.reduce((s, p) => s + (p.area || 0), 0);
	const docCount =
		properties.reduce((s, p) => s + (p.documents?.length ?? 0), 0) + aiDocCount;

	const now = new Date();
	const greeting =
		now.getHours() < 12
			? "Good morning"
			: now.getHours() < 18
				? "Good afternoon"
				: "Good evening";

	const dateStr = now.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	return (
		<AppShell>
			<div data-animate={animate || undefined}>
				{/* Full-width header area */}
				<div className="px-(--size-page-px) pt-(--size-page-py)">
					{loading && (
						<div className="space-y-6 max-w-6xl">
							<PageHeadingSkeleton />
							<MetricGridSkeleton />
						</div>
					)}

					{/* Empty state */}
					{!loading && properties.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 text-center mx-auto max-w-2xl pt-30">
							<img
								src="/empty-dashboard.png"
								alt="No properties illustration"
								className="w-[clamp(16rem,50vw,38rem)] h-auto object-contain mb-8"
							/>
							<h3 className="font-headline typo-section-title font-bold text-primary mb-2">
								No portfolio data yet
							</h3>
							<p className="text-on-surface-variant typo-body mb-6">
								Add your first property to start managing your portfolio.
							</p>
						</div>
					)}

					{!loading && properties.length > 0 && (
						<>
							{/* ── Welcome header + Summary stats (full width) ── */}
							<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 animate-fade-in">
								<div className="shrink-0">
									<p className="typo-caption text-outline font-semibold uppercase tracking-widest mb-1">
										{dateStr}
									</p>
									<h1 className="font-headline typo-page-title font-extrabold text-primary">
										{greeting}, {user.displayName || user.name}
									</h1>
									{activePortfolio && (
										<p className="typo-body text-on-surface-variant mt-0.5">
											Workspace:{" "}
											<span className="font-bold text-secondary">
												{activePortfolio.name}
											</span>
										</p>
									)}
								</div>

								<div className="flex flex-wrap items-stretch gap-3">
									<StatCard
										label="Portfolio Value"
										value={formatCurrencyCompact(totalWorth)}
										icon={
											<Wallet className="sz-icon text-blue-600 dark:text-blue-400" />
										}
										accent="bg-blue-50 dark:bg-blue-500/20"
									/>
									<StatCard
										label="ROI"
										value={roiValue}
										icon={
											<TrendingUp
												className={`sz-icon ${roiPct != null && roiPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
											/>
										}
										accent={roiAccent}
									/>
									<StatCard
										label="Properties"
										value={String(properties.length)}
										icon={
											<Building2 className="sz-icon text-emerald-600 dark:text-emerald-400" />
										}
										accent="bg-emerald-50 dark:bg-emerald-500/20"
									/>
									<StatCard
										label="Total Area"
										value={`${totalArea.toLocaleString()} sqm`}
										icon={
											<MapPin className="sz-icon text-violet-600 dark:text-violet-400" />
										}
										accent="bg-violet-50 dark:bg-violet-500/20"
									/>
									<StatCard
										label="Documents"
										value={String(docCount)}
										icon={
											<FileText className="sz-icon text-amber-600 dark:text-amber-400" />
										}
										accent="bg-amber-50 dark:bg-amber-500/20"
									/>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Constrained content area */}
				{!loading && properties.length > 0 && (
					<div className="sz-page pt-0">
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_350px_350px] gap-4">
							{/* ── Property billboard + value trend ── */}
							<div className="min-w-0 lg:row-span-2 space-y-4">
								<PropertySlideshowWidget
									properties={properties}
									onSelect={setSelectedId}
								/>
								<ValueTrendWidget properties={properties} />
							</div>

							{/* ── First widget column ── */}
							<div className="space-y-4">
								<EngagementWidgets userId={user.id} bookings={bookings} />
								<CalendarWidget properties={properties} bookings={bookings} />
							</div>

							{/* ── Second widget column (stacks below first on lg, beside on xl) ── */}
							<div className="space-y-4">
								<PortfolioHealthWidget properties={properties} />
								<RecentDocumentsWidget properties={properties} />
								<StatusDistributionWidget properties={properties} />
								<MiniMapWidget
									properties={properties}
									onSelect={setSelectedId}
								/>
							</div>
						</div>
					</div>
				)}
				{/* ── Quick links ── */}
				{/* <div className="flex flex-wrap gap-3 justify-end mb-5 mr-5">
					<Link
						href="/portfolio/properties"
						className="signature-gradient text-white font-headline typo-btn font-bold uppercase tracking-widest sz-btn flex items-center gap-2 btn-press"
					>
						<TrendingUp className="sz-icon" />
						All Properties
					</Link>
					<Link
						href="/portfolio/map"
						className="bg-card border border-border text-primary font-headline typo-btn font-bold uppercase tracking-widest sz-btn flex items-center gap-2 hover:shadow-md transition-all btn-press"
					>
						<MapPin className="sz-icon" />
						Map View
					</Link>
				</div> */}
			</div>

			{/* Slide-in property drawer */}
			<PropertyDrawer
				propertyId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</AppShell>
	);
}
