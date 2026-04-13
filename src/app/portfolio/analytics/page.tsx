"use client";

import { useRequireAuth } from "@/components/AuthContext";
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
import { useMyProperties } from "@/hooks/usePropertyQueries";
import { formatCurrencyCompact } from "@/lib/utils";
import {
	ArrowUpRight,
	Building2,
	DollarSign,
	FileText,
	Loader2,
	Ruler,
	TrendingUp,
} from "lucide-react";

export default function AnalyticsPage() {
	const { user, loading: authLoading } = useRequireAuth();
	const { data: properties = [], isLoading: loading } = useMyProperties(
		user?.id,
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
			<div className="sz-page max-w-6xl">
				{/* Header */}
				<div className="mb-8">
					<h1 className="font-headline typo-page-title font-extrabold text-on-surface mb-1">
						Analytics
					</h1>
					<p className="typo-body text-on-surface-variant">
						Portfolio performance, distribution, and insights
					</p>
				</div>

				{loading ? (
					<div className="space-y-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="h-28 bg-card rounded-2xl animate-pulse border border-border"
								/>
							))}
						</div>
						<div className="h-80 bg-card rounded-2xl animate-pulse border border-border" />
					</div>
				) : (
					<>
						{/* ── KPI Cards ── */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
							<KpiCard
								label="Total Value"
								value={formatCurrencyCompact(totalValue)}
								sub={`${growthPct}% growth`}
								icon={DollarSign}
								trend="up"
							/>
							<KpiCard
								label="Properties"
								value={String(properties.length)}
								sub={`${countries.size} ${countries.size === 1 ? "country" : "countries"}`}
								icon={Building2}
							/>
							<KpiCard
								label="Total Area"
								value={`${totalArea.toLocaleString()} sqm`}
								sub={`Avg ${properties.length ? Math.round(totalArea / properties.length).toLocaleString() : 0} sqm`}
								icon={Ruler}
							/>
							<KpiCard
								label="Documents"
								value={String(docCount)}
								sub={`${properties.length ? (docCount / properties.length).toFixed(1) : 0} per property`}
								icon={FileText}
							/>
						</div>

						{/* ── Charts Grid ── */}
						<div className="grid grid-cols-1 lg:grid-cols-2 sz-gap-section">
							{/* Portfolio value trend — large, spans full width */}
							<AnalyticsChartCard
								title="Portfolio Value Trend"
								subtitle="12-month purchase vs current value"
								badge={`+${growthPct}%`}
								badgeColor="bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-300"
								className="lg:col-span-2 max-w-none!"
							>
								<PortfolioValueChart properties={properties} />
							</AnalyticsChartCard>

							{/* Property type distribution */}
							<AnalyticsChartCard
								title="Property Types"
								subtitle="Distribution by category"
							>
								<PropertyTypeChart properties={properties} />
							</AnalyticsChartCard>

							{/* Status breakdown */}
							<AnalyticsChartCard
								title="Status Breakdown"
								subtitle="Properties by current status"
							>
								<StatusBarChart properties={properties} />
							</AnalyticsChartCard>

							{/* Monthly acquisitions */}
							<AnalyticsChartCard
								title="Acquisition Timeline"
								subtitle="Cumulative properties and spending"
								className="lg:col-span-2 max-w-none!"
							>
								<MonthlyAcquisitionsChart properties={properties} />
							</AnalyticsChartCard>

							{/* Area distribution */}
							<AnalyticsChartCard
								title="Area Distribution"
								subtitle="Properties grouped by size"
							>
								<AreaDistributionChart properties={properties} />
							</AnalyticsChartCard>

							{/* Document coverage radar */}
							<AnalyticsChartCard
								title="Document Coverage"
								subtitle="Types of documents across portfolio"
							>
								<DocumentCoverageChart properties={properties} />
							</AnalyticsChartCard>

							{/* Price vs Area scatter */}
							<AnalyticsChartCard
								title="Price vs Area"
								subtitle="Correlation between property size and price"
							>
								<PriceVsAreaScatter properties={properties} />
							</AnalyticsChartCard>

							{/* Value by country */}
							<AnalyticsChartCard
								title="Value by Region"
								subtitle="Portfolio value across countries"
							>
								<ValueByCountryChart properties={properties} />
							</AnalyticsChartCard>

							{/* Condition breakdown */}
							<AnalyticsChartCard
								title="Property Conditions"
								subtitle="Physical state of properties"
							>
								<ConditionBreakdownChart properties={properties} />
							</AnalyticsChartCard>

							{/* Quick stats summary */}
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
										value={getMostCommon(properties.map((p) => p.propertyType))}
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
					</>
				)}
			</div>
		</AppShell>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
	label,
	value,
	sub,
	icon: Icon,
	trend,
}: {
	label: string;
	value: string;
	sub: string;
	icon: React.ElementType;
	trend?: "up" | "down";
}) {
	return (
		<div className="bg-card rounded-2xl border border-border p-5 max-w-xs flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
					<Icon className="w-4 h-4 text-primary" />
				</div>
				<span className="typo-caption font-semibold text-on-surface-variant">
					{label}
				</span>
			</div>
			<span className="font-headline typo-stat font-extrabold text-on-surface">
				{value}
			</span>
			<div className="flex items-center gap-1">
				{trend === "up" && (
					<ArrowUpRight className="w-3 h-3 text-emerald-500" />
				)}
				{trend === "down" && (
					<TrendingUp className="w-3 h-3 text-red-500 rotate-90" />
				)}
				<span className="typo-caption text-on-surface-variant">{sub}</span>
			</div>
		</div>
	);
}

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
