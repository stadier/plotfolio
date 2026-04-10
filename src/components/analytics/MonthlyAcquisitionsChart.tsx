"use client";

import { Property } from "@/types/property";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface MonthlyAcquisitionsChartProps {
	properties: Property[];
}

export default function MonthlyAcquisitionsChart({
	properties,
}: MonthlyAcquisitionsChartProps) {
	const months = [
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

	// Group properties by purchase month
	const monthCounts = new Array(12).fill(0);
	const monthValues = new Array(12).fill(0);
	for (const p of properties) {
		if (p.purchaseDate) {
			const d = new Date(p.purchaseDate);
			const m = d.getMonth();
			monthCounts[m] += 1;
			monthValues[m] += p.purchasePrice || 0;
		}
	}

	// Cumulative acquisitions
	let cumulative = 0;
	const data = months.map((month, i) => {
		cumulative += monthCounts[i];
		return {
			month,
			acquisitions: monthCounts[i],
			cumulative,
			spent: Math.round(monthValues[i]),
		};
	});

	return (
		<ResponsiveContainer width="100%" height={280}>
			<LineChart data={data}>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--chart-grid)"
					vertical={false}
				/>
				<XAxis
					dataKey="month"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					yAxisId="count"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
					allowDecimals={false}
					width={30}
				/>
				<YAxis
					yAxisId="value"
					orientation="right"
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
				<Tooltip
					contentStyle={{
						background: "var(--color-card)",
						border: "1px solid var(--color-border)",
						borderRadius: 12,
						fontSize: 12,
					}}
					formatter={(value: number, name: string) => {
						if (name === "Spent")
							return [`$${value.toLocaleString()}`, name];
						return [value, name];
					}}
				/>
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
				/>
				<Line
					yAxisId="count"
					type="monotone"
					dataKey="cumulative"
					name="Total Properties"
					stroke="#60a5fa"
					strokeWidth={2.5}
					dot={false}
					activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
				/>
				<Line
					yAxisId="value"
					type="monotone"
					dataKey="spent"
					name="Spent"
					stroke="#f472b6"
					strokeWidth={2}
					strokeDasharray="5 5"
					dot={false}
					activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
