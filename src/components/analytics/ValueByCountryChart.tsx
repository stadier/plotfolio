"use client";

import { Property } from "@/types/property";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface ValueByCountryChartProps {
	properties: Property[];
}

export default function ValueByCountryChart({
	properties,
}: ValueByCountryChartProps) {
	const grouped: Record<string, { count: number; value: number }> = {};
	for (const p of properties) {
		const key = p.country || "Unknown";
		if (!grouped[key]) grouped[key] = { count: 0, value: 0 };
		grouped[key].count += 1;
		grouped[key].value += p.currentValue || p.purchasePrice || 0;
	}

	const data = Object.entries(grouped)
		.map(([country, info]) => ({
			country,
			count: info.count,
			value: Math.round(info.value),
		}))
		.sort((a, b) => b.value - a.value)
		.slice(0, 8);

	return (
		<ResponsiveContainer width="100%" height={260}>
			<BarChart data={data} barSize={28} barGap={4}>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--chart-grid)"
					vertical={false}
				/>
				<XAxis
					dataKey="country"
					tick={{ fontSize: 10, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					yAxisId="value"
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
					width={50}
				/>
				<YAxis
					yAxisId="count"
					orientation="right"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
					allowDecimals={false}
					width={30}
				/>
				<Tooltip
					contentStyle={{
						background: "var(--color-card)",
						border: "1px solid var(--color-border)",
						borderRadius: 12,
						fontSize: 12,
					}}
					formatter={(value: number, name: string) => {
						if (name === "Value")
							return [`$${value.toLocaleString()}`, name];
						return [value, name];
					}}
				/>
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
				/>
				<Bar
					yAxisId="value"
					dataKey="value"
					name="Value"
					fill="#60a5fa"
					radius={[6, 6, 0, 0]}
				/>
				<Bar
					yAxisId="count"
					dataKey="count"
					name="Properties"
					fill="#fbbf24"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
