"use client";

import { useRequireAuth } from "@/components/AuthContext";
import DocumentCompletionWidget from "@/components/dashboard/DocumentCompletionWidget";
import { CARD_GRADIENTS } from "@/components/dashboard/helpers";
import MiniMapWidget from "@/components/dashboard/MiniMapWidget";
import PortfolioStatsWidget from "@/components/dashboard/PortfolioStatsWidget";
import RecentActivityWidget from "@/components/dashboard/RecentActivityWidget";
import StatusDistributionWidget from "@/components/dashboard/StatusDistributionWidget";
import TrackingCard from "@/components/dashboard/TrackingCard";
import UpcomingDatesWidget from "@/components/dashboard/UpcomingDatesWidget";
import ValueTrendWidget from "@/components/dashboard/ValueTrendWidget";
import AppShell from "@/components/layout/AppShell";
import { usePortfolio } from "@/components/PortfolioContext";
import PropertyDrawer from "@/components/property/PropertyDrawer";
import useAnimateOnce from "@/hooks/useAnimateOnce";
import { useMyProperties } from "@/hooks/usePropertyQueries";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";
import { PropertyStatus } from "@/types/property";
import { Eye, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { user, loading: authLoading } = useRequireAuth();
	const { activePortfolio } = usePortfolio();
	const animate = useAnimateOnce("dashboard");
	const { data: properties = [], isLoading: loading } = useMyProperties(
		user?.id,
		activePortfolio?.id,
		activePortfolio?.createdBy === user?.id,
	);

	// Show loading while checking auth
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
	const totalArea = properties.reduce((s, p) => s + (p.area || 0), 0);
	const docCount = properties.reduce(
		(s, p) => s + (p.documents?.length ?? 0),
		0,
	);
	const now = new Date();
	const dateStr = now.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const heroProperty = properties[0];
	// Simulate tracked listings: own properties + some marked as marketplace
	const trackedProperties = properties.slice(0, 6);

	return (
		<AppShell>
			<div
				className="flex sz-gap-section sz-page"
				data-animate={animate || undefined}
			>
				{/* ── Left: main dashboard content ── */}
				<div className="flex-1 min-w-0">
					{/* Loading skeleton */}
					{loading && (
						<div className="space-y-6">
							<div className="flex gap-10">
								<div className="h-16 w-48 bg-card rounded-2xl animate-pulse" />
								<div className="h-16 w-32 bg-card rounded-2xl animate-pulse" />
							</div>
							<div className="h-80 bg-card rounded-2xl animate-pulse" />
							<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="h-36 bg-card rounded-2xl animate-pulse" />
								<div className="h-36 bg-card rounded-2xl animate-pulse" />
								<div className="h-36 bg-card rounded-2xl animate-pulse" />
								<div className="h-36 bg-card rounded-2xl animate-pulse" />
							</div>
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
							{/* Large headline stats */}
							<div className="flex flex-wrap items-end gap-4 sm:gap-10 mb-6 animate-fade-in">
								<div>
									<p className="typo-caption text-on-surface-variant font-semibold uppercase tracking-widest mb-1">
										Portfolio Worth
									</p>
									<p className="font-headline typo-stat-lg font-extrabold tracking-tight text-primary">
										{formatCurrencyCompact(totalWorth)}
									</p>
								</div>
								<div>
									<p className="typo-caption text-on-surface-variant font-semibold uppercase tracking-widest mb-1">
										Properties Owned
									</p>
									<p className="font-headline typo-stat-lg font-extrabold tracking-tight text-primary">
										{properties.length}
									</p>
								</div>
							</div>

							{/* Hero property + Value Trend side by side */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								{/* Hero property card */}
								{heroProperty && (
									<div
										onClick={() => setSelectedId(heroProperty.id)}
										className={`relative rounded-2xl overflow-hidden cursor-pointer h-72 md:col-span-2 ${CARD_GRADIENTS[0]} card-hover animate-scale-in`}
									>
										<div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
											<MapPin className="w-64 h-64 text-white" />
										</div>
										<div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/60 to-transparent">
											<div className="flex items-end justify-between">
												<div>
													<p className="text-white/70 typo-caption font-bold uppercase tracking-widest mb-1">
														Featured Property
													</p>
													<h3 className="font-headline typo-section-title font-bold text-white">
														{heroProperty.name}
													</h3>
													<p className="text-white/60 typo-body-sm mt-0.5 flex items-center gap-1">
														<MapPin className="w-3 h-3" />
														{heroProperty.address}
													</p>
												</div>
												<div className="text-right">
													<p className="font-headline typo-stat font-extrabold text-white">
														{formatCurrencyFull(
															heroProperty.currentValue ||
																heroProperty.purchasePrice ||
																0,
															heroProperty.country,
														)}
													</p>
													<p className="text-white/50 typo-caption">
														{(heroProperty.area || 0).toLocaleString()} sqm
													</p>
												</div>
											</div>
										</div>
									</div>
								)}
								{/* Value Trend beside hero */}
								<ValueTrendWidget properties={properties} />
							</div>

							{/* Masonry widget grid */}
							<div className="columns-2 lg:columns-3 gap-4 space-y-4 mb-6">
								<PortfolioStatsWidget
									totalArea={totalArea}
									docCount={docCount}
								/>
								<RecentActivityWidget
									properties={properties}
									onSelect={setSelectedId}
								/>
								<StatusDistributionWidget properties={properties} />
								<DocumentCompletionWidget properties={properties} />
								<MiniMapWidget
									properties={properties}
									onSelect={setSelectedId}
								/>
								<UpcomingDatesWidget properties={properties} />
							</div>

							{/* Quick actions */}
							{/* <div className="flex flex-wrap items-center gap-4">
								<Link
									href="/portfolio/properties"
									className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow active:scale-95 transition-all flex items-center gap-2 btn-press"
								>
									<TrendingUp className="w-4 h-4" />
									All Properties
								</Link>
								<Link
									href="/portfolio/map"
									className="bg-card border border-border text-primary font-headline font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg hover:shadow-md transition-all flex items-center gap-2 btn-press"
								>
									<MapPin className="w-4 h-4" />
									Map View
								</Link>
							</div> */}
						</>
					)}
				</div>

				{/* ── Right: Tracking Board (full-height panel) ── */}
				{!loading && properties.length > 0 && (
					<aside className="hidden lg:block w-80 shrink-0 bg-card border-l border-border -mr-(--size-page-px) -my-(--size-page-py) pl-5 pr-(--size-page-px) py-(--size-page-py)">
						<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto animate-fade-in-up">
							{/* Header */}
							<div className="flex items-center justify-between mb-5">
								<div className="flex items-center gap-2">
									<Eye className="w-4 h-4 text-secondary" />
									<h2 className="font-headline typo-section-title font-bold text-primary">
										Tracking Board
									</h2>
								</div>
								<span className="typo-badge font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
									{trackedProperties.length} tracked
								</span>
							</div>

							{/* Tracked listings */}
							<div className="flex flex-col gap-1">
								{trackedProperties.map((property, idx) => (
									<TrackingCard
										key={property.id}
										property={property}
										gradientClass={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
										isOwn={property.status === PropertyStatus.OWNED}
										onSelect={setSelectedId}
									/>
								))}
							</div>

							{/* Footer */}
							<div className="mt-4 pt-4 border-t border-border">
								<Link
									href="/marketplace"
									className="typo-caption font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors"
								>
									Browse Marketplace →
								</Link>
							</div>
						</div>
					</aside>
				)}
			</div>

			{/* Slide-in property drawer */}
			<PropertyDrawer
				propertyId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</AppShell>
	);
}
