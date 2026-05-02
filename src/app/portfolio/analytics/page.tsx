"use client";

import { useRequireAuth } from "@/components/AuthContext";
import { usePortfolio } from "@/components/PortfolioContext";
import AnalyticsChartCard from "@/components/analytics/AnalyticsChartCard";
import AreaDistributionChart from "@/components/analytics/AreaDistributionChart";
import ConditionBreakdownChart from "@/components/analytics/ConditionBreakdownChart";
import DocumentCoverageChart from "@/components/analytics/DocumentCoverageChart";
import MonthlyAcquisitionsChart from "@/components/analytics/MonthlyAcquisitionsChart";
import PortfolioValueChart from "@/components/analytics/PortfolioValueChart";
import PriceVsAreaScatter from "@/components/analytics/PriceVsAreaScatter";
import PropertyTypeChart from "@/components/analytics/PropertyTypeChart";
import StatusBarChart from "@/components/analytics/StatusBarChart";
import ValueByCountryChart from "@/components/analytics/ValueByCountryChart";
import AppShell from "@/components/layout/AppShell";
import SummaryStatCard from "@/components/property/SummaryStatCard";
import { ChartSkeleton, MetricGridSkeleton } from "@/components/ui/skeletons";
import { useMyProperties } from "@/hooks/usePropertyQueries";
import { formatCurrencyCompact } from "@/lib/utils";
import {
	BarChart3,
	Building2,
	DollarSign,
	FileText,
	Loader2,
	Ruler,
} from "lucide-react";

export default function AnalyticsPage() {
	const { user, loading: authLoading } = useRequireAuth();
	const { activePortfolio } = usePortfolio();
	const { data: properties = [], isLoading: loading } = useMyProperties(
		user?.id,
		activePortfolio?.id,
		activePortfolio?.createdBy === user?.id,
	);

	if (authLoading || !user) {
		return (
			<AppShell>
				<div className="flex items-center justify-center h-[60vh]">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
				</div>
			</AppShell>
		);
	}

	// ── Computed stats ──
	const totalValue = properties.reduce(
		(s, p) => s + (p.currentValue || p.purchasePrice || 0),
		0,
	);
	const totalPurchase = properties.reduce(
		(s, p) => s + (p.purchasePrice || 0),
		0,
	);
	const totalArea = properties.reduce((s, p) => s + (p.area || 0), 0);
	const docCount = properties.reduce(
		(s, p) => s + (p.documents?.length ?? 0),
		0,
	);
	const growthPct =
		totalPurchase > 0
			? (((totalValue - totalPurchase) / totalPurchase) * 100).toFixed(1)
			: "0";
	const avgValue =
		properties.length > 0 ? Math.round(totalValue / properties.length) : 0;
	const countries = new Set(properties.map((p) => p.country).filter(Boolean));

	return (
		<AppShell>
			<div className="sz-page">
				{/* Page header + summary stats */}
				<div className="flex flex-wrap items-start justify-between sz-gap-section mb-8 animate-fade-in">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<BarChart3 className="w-5 h-5 text-secondary" />
							<h1 className="font-headline typo-page-title font-extrabold tracking-tighter text-primary">
								Analytics
							</h1>
						</div>
						<p className="typo-body text-on-surface-variant ml-8">
							Portfolio performance, distribution, and insights
						</p>
					</div>
					{!loading && properties.length > 0 && (
						<div className="flex flex-nowrap md:flex-wrap items-start gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
							{[
								{
									label: "Total Value",
									value: formatCurrencyCompact(totalValue),
									icon: DollarSign,
								},
								{
									label: "Properties",
									value: String(properties.length),
									icon: Building2,
								},
								{
									label: "Total Area",
									value: `${totalArea.toLocaleString()} sqm`,
									icon: Ruler,
								},
								{ label: "Documents", value: String(docCount), icon: FileText },
							].map((stat, i) => (
								<div
									key={stat.label}
									style={{ animationDelay: `${i * 0.06}s` }}
									className="animate-fade-in-up shrink-0"
								>
									<SummaryStatCard
										label={stat.label}
										value={stat.value}
										icon={stat.icon}
									/>
								</div>
							))}
						</div>
					)}
				</div>

				{loading ? (
					<div className="space-y-6">
						<MetricGridSkeleton />
						<ChartSkeleton height={320} />
					</div>
				) : (
					<>
						{/* ── Charts Grid — 12-column responsive ── */}
						<div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-4">
							{/* Portfolio value trend */}
							<div className="col-span-4 sm:col-span-6 lg:col-span-6">
								<AnalyticsChartCard
									title="Portfolio Value Trend"
									subtitle="12-month purchase vs current value"
									badge={`+${growthPct}%`}
									badgeColor="bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-300"
									className="h-full"
								>
									<PortfolioValueChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Status breakdown */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-3">
								<AnalyticsChartCard
									title="Status Breakdown"
									subtitle="Properties by current status"
									className="h-full"
								>
									<StatusBarChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Property type distribution */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-3">
								<AnalyticsChartCard
									title="Property Types"
									subtitle="Distribution by category"
									className="h-full"
								>
									<PropertyTypeChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Monthly acquisitions — full width */}
							<div className="col-span-4 sm:col-span-6 lg:col-span-12">
								<AnalyticsChartCard
									title="Acquisition Timeline"
									subtitle="Cumulative properties and spending"
								>
									<MonthlyAcquisitionsChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Area distribution */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Area Distribution"
									subtitle="Properties grouped by size"
								>
									<AreaDistributionChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Document coverage radar */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Document Coverage"
									subtitle="Types of documents across portfolio"
								>
									<DocumentCoverageChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Price vs Area scatter */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Price vs Area"
									subtitle="Correlation between property size and price"
								>
									<PriceVsAreaScatter properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Value by country */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Value by Region"
									subtitle="Portfolio value across countries"
								>
									<ValueByCountryChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Condition breakdown */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Property Conditions"
									subtitle="Physical state of properties"
								>
									<ConditionBreakdownChart properties={properties} />
								</AnalyticsChartCard>
							</div>

							{/* Quick stats summary */}
							<div className="col-span-4 sm:col-span-3 lg:col-span-4">
								<AnalyticsChartCard
									title="Quick Insights"
									subtitle="Key portfolio metrics"
								>
									<div className="grid grid-cols-2 gap-4 py-2">
										<InsightRow
											label="Avg Property Value"
											value={formatCurrencyCompact(avgValue)}
										/>
										<InsightRow
											label="Most Common Type"
											value={getMostCommon(
												properties.map((p) => p.propertyType),
											)}
										/>
										<InsightRow
											label="Properties w/ Docs"
											value={`${properties.filter((p) => (p.documents?.length ?? 0) > 0).length}/${properties.length}`}
										/>
										<InsightRow
											label="With Boundaries"
											value={`${properties.filter((p) => p.surveyData?.coordinates?.length).length}/${properties.length}`}
										/>
										<InsightRow
											label="Listed"
											value={String(
												properties.filter(
													(p) =>
														p.status === "for_sale" ||
														p.status === "for_rent" ||
														p.status === "for_lease",
												).length,
											)}
										/>
										<InsightRow
											label="Total Investment"
											value={formatCurrencyCompact(totalPurchase)}
										/>
									</div>
								</AnalyticsChartCard>
							</div>
						</div>
					</>
				)}
			</div>
		</AppShell>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="typo-badge text-outline uppercase tracking-wide">
				{label}
			</span>
			<span className="typo-body font-bold text-on-surface">{value}</span>
		</div>
	);
}

function getMostCommon(arr: string[]): string {
	const counts: Record<string, number> = {};
	for (const item of arr) {
		counts[item] = (counts[item] ?? 0) + 1;
	}
	const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	const top = sorted[0]?.[0] ?? "N/A";
	return top.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
