"use client";

import { Property, PropertyStatus } from "@/types/property";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const STATUS_COLORS: Record<PropertyStatus, string> = {
	[PropertyStatus.OWNED]: "#22c55e",
	[PropertyStatus.FOR_SALE]: "#3b82f6",
	[PropertyStatus.DEVELOPMENT]: "#f59e0b",
	[PropertyStatus.UNDER_CONTRACT]: "#f97316",
	[PropertyStatus.RENTED]: "#a855f7",
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
	[PropertyStatus.OWNED]: "Owned",
	[PropertyStatus.FOR_SALE]: "For Sale",
	[PropertyStatus.DEVELOPMENT]: "Development",
	[PropertyStatus.UNDER_CONTRACT]: "Contract",
	[PropertyStatus.RENTED]: "Rented",
};

interface StatusBarChartProps {
	properties: Property[];
}

export default function StatusBarChart({ properties }: StatusBarChartProps) {
	const counts = properties.reduce<Record<string, number>>((acc, p) => {
		acc[p.status] = (acc[p.status] ?? 0) + 1;
		return acc;
	}, {});

	const data = Object.entries(counts).map(([status, count]) => ({
		name: STATUS_LABELS[status as PropertyStatus] ?? status,
		count,
		color: STATUS_COLORS[status as PropertyStatus] ?? "#94a3b8",
	}));

	return (
		<ResponsiveContainer width="100%" height={260}>
			<BarChart data={data} barSize={36}>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--chart-grid)"
					vertical={false}
				/>
				<XAxis
					dataKey="name"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
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
				<Bar dataKey="count" radius={[6, 6, 0, 0]}>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.color} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
