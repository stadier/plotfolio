"use client";

import { Property } from "@/types/property";
import { useState, type ElementType } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Period = "monthly" | "quarterly" | "yearly";

interface DashboardOverviewWidgetProps {
	properties: Property[];
}

/* ── Small metric card for the bottom row ───────────────────────────────────── */

interface MetricCardProps {
	icon: ElementType;
	iconBg: string;
	iconColor: string;
	label: string;
	value: string;
}

function MetricCard({
	icon: Icon,
	iconBg,
	iconColor,
	label,
	value,
}: MetricCardProps) {
	return (
		<div className="bg-card sz-card border border-border flex items-center gap-3 max-w-xs widget-card">
			<div
				className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
			>
				<Icon className={`sz-icon ${iconColor}`} />
			</div>
			<div className="min-w-0">
				<p className="typo-caption text-outline font-medium leading-tight truncate">
					{label}
				</p>
				<p className="font-headline text-base font-extrabold text-on-surface truncate">
					{value}
				</p>
			</div>
		</div>
	);
}

/* ── Chart data builder ─────────────────────────────────────────────────────── */

function buildChartData(properties: Property[], period: Period) {
	const labels =
		period === "yearly"
			? ["2022", "2023", "2024", "2025", "2026"]
			: period === "quarterly"
				? ["Q1", "Q2", "Q3", "Q4"]
				: [
						"Jan",
						"Feb",
						"Mar",
						"Apr",
						"May",
						"Jun",
						"Jul",
						"Aug",
						"Sep",
						"Oct",
						"Nov",
						"Dec",
					];

	const totalPurchase = properties.reduce(
		(s, p) => s + (p.purchasePrice || 0),
		0,
	);
	const totalCurrent = properties.reduce(
		(s, p) => s + (p.currentValue || p.purchasePrice || 0),
		0,
	);

	return labels.map((label, i) => {
		const progress = i / (labels.length - 1 || 1);
		const jitter = Math.sin(i * 1.8) * totalPurchase * 0.04;
		const purchase = totalPurchase + jitter * 0.3;
		const current =
			totalPurchase + (totalCurrent - totalPurchase) * progress + jitter;
		return {
			label,
			purchase: Math.round(purchase),
			current: Math.round(Math.max(current, purchase * 0.95)),
		};
	});
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function DashboardOverviewWidget({
	properties,
}: DashboardOverviewWidgetProps) {
	const [period, setPeriod] = useState<Period>("monthly");
	const chartData = buildChartData(properties, period);

	const totalValue = properties.reduce(
		(sum, p) => sum + (p.currentValue || p.purchasePrice || 0),
		0,
	);
	const totalPurchase = properties.reduce(
		(sum, p) => sum + (p.purchasePrice || 0),
		0,
	);
	const growth =
		totalPurchase > 0
			? ((totalValue - totalPurchase) / totalPurchase) * 100
			: 0;
	const avgValue = properties.length > 0 ? totalValue / properties.length : 0;
	const docCount = properties.reduce(
		(s, p) => s + (p.documents?.length ?? 0),
		0,
	);

	const periods: { key: Period; label: string }[] = [
		{ key: "monthly", label: "Monthly" },
		{ key: "quarterly", label: "Quarterly" },
		{ key: "yearly", label: "Yearly" },
	];

	return (
		<div className="space-y-4">
			{/* ── Main overview card ── */}
			<div className="bg-card sz-card border border-border widget-card animate-fade-in-up max-w-4xl">
				{/* Header row */}
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
					{/* Left: Title + stats */}
					<div>
						<h2 className="font-headline typo-section-title font-bold text-on-surface">
							Overview of latest month
						</h2>
						{/* <p className="typo-caption text-outline">
							Overview of latest month
						</p> */}

						{/* <p className="font-headline text-2xl sm:text-3xl font-extrabold text-primary mt-4 leading-tight">
							{formatCurrencyCompact(totalValue)}
						</p>
						<p className="typo-caption text-outline font-medium">
							Current Portfolio Value
						</p>

						<p className="font-headline text-xl font-extrabold text-on-surface mt-3 leading-tight">
							{properties.length}
						</p>
						<p className="typo-caption text-outline font-medium">
							Total Properties
						</p> */}
					</div>

					{/* Right: Period tabs + legend */}
					<div className="flex flex-col items-end gap-3">
						<div className="flex gap-1 bg-surface-container rounded-full p-1">
							{periods.map(({ key, label }) => (
								<button
									key={key}
									onClick={() => setPeriod(key)}
									className={`typo-caption font-bold px-3 py-1 rounded-full transition-all ${
										period === key
											? "text-primary bg-card shadow-sm"
											: "text-outline hover:text-on-surface-variant"
									}`}
								>
									{label}
								</button>
							))}
						</div>
						<div className="flex items-center gap-4 typo-caption text-on-surface-variant">
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
								Current Value
							</span>
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
								Purchase Price
							</span>
						</div>
					</div>
				</div>

				{/* Chart */}
				<div className="-mx-2">
					<ResponsiveContainer width="100%" height={220}>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient
									id="dashGradCurrent"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
									<stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
								</linearGradient>
								<linearGradient
									id="dashGradPurchase"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
									<stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--chart-grid)"
								vertical={false}
							/>
							<XAxis
								dataKey="label"
								tick={{ fontSize: 11, fill: "var(--chart-label)" }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								tick={{ fontSize: 11, fill: "var(--chart-label)" }}
								axisLine={false}
								tickLine={false}
								tickFormatter={(v) =>
									v >= 1_000_000
										? `${(v / 1_000_000).toFixed(1)}M`
										: v >= 1_000
											? `${(v / 1_000).toFixed(0)}K`
											: String(v)
								}
								width={48}
							/>
							<Tooltip
								contentStyle={{
									background: "var(--color-card)",
									border: "1px solid var(--color-border)",
									borderRadius: 12,
									fontSize: 12,
								}}
								formatter={(value: number) => [
									`$${value.toLocaleString()}`,
									undefined,
								]}
							/>
							<Area
								type="monotone"
								dataKey="current"
								name="Current Value"
								stroke="#8b5cf6"
								strokeWidth={2.5}
								fill="url(#dashGradCurrent)"
								dot={false}
								activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
							/>
							<Area
								type="monotone"
								dataKey="purchase"
								name="Purchase Price"
								stroke="#f59e0b"
								strokeWidth={2.5}
								fill="url(#dashGradPurchase)"
								dot={false}
								activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* ── Bottom metric cards ── */}
			{/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
				<MetricCard
					icon={Wallet}
					iconBg="bg-violet-50 dark:bg-violet-500/20"
					iconColor="text-violet-600 dark:text-violet-400"
					label="Portfolio Value"
					value={formatCurrencyCompact(totalValue)}
				/>
				<MetricCard
					icon={TrendingUp}
					iconBg="bg-emerald-50 dark:bg-emerald-500/20"
					iconColor="text-emerald-600 dark:text-emerald-400"
					label="Growth"
					value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
				/>
				<MetricCard
					icon={BarChart3}
					iconBg="bg-amber-50 dark:bg-amber-500/20"
					iconColor="text-amber-600 dark:text-amber-400"
					label="Avg. Property Value"
					value={formatCurrencyCompact(avgValue)}
				/>
				<MetricCard
					icon={FileText}
					iconBg="bg-blue-50 dark:bg-blue-500/20"
					iconColor="text-blue-600 dark:text-blue-400"
					label="Documents"
					value={String(docCount)}
				/>
			</div> */}
		</div>
	);
}
