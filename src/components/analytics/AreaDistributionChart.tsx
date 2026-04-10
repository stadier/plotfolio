"use client";

import { Property } from "@/types/property";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface AreaDistributionChartProps {
	properties: Property[];
}

export default function AreaDistributionChart({
	properties,
}: AreaDistributionChartProps) {
	const buckets = [
		{ label: "< 500", min: 0, max: 500 },
		{ label: "500–1K", min: 500, max: 1000 },
		{ label: "1K–2K", min: 1000, max: 2000 },
		{ label: "2K–5K", min: 2000, max: 5000 },
		{ label: "5K–10K", min: 5000, max: 10000 },
		{ label: "> 10K", min: 10000, max: Infinity },
	];

	const data = buckets.map((bucket) => ({
		range: bucket.label,
		count: properties.filter(
			(p) => (p.area || 0) >= bucket.min && (p.area || 0) < bucket.max,
		).length,
	}));

	return (
		<ResponsiveContainer width="100%" height={260}>
			<BarChart data={data} barSize={32}>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--chart-grid)"
					vertical={false}
				/>
				<XAxis
					dataKey="range"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
					label={{
						value: "sqm",
						position: "insideBottomRight",
						offset: -5,
						fontSize: 10,
						fill: "var(--chart-label)",
					}}
				/>
				<YAxis
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
				/>
				<Bar
					dataKey="count"
					name="Properties"
					fill="#a78bfa"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
