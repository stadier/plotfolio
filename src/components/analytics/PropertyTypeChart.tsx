"use client";

import { Property, PropertyType } from "@/types/property";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
	[PropertyType.LAND]: "#94a3b8",
	[PropertyType.HOUSE]: "#60a5fa",
	[PropertyType.APARTMENT]: "#f472b6",
	[PropertyType.BUILDING]: "#a78bfa",
	[PropertyType.OFFICE]: "#38bdf8",
	[PropertyType.RETAIL]: "#fbbf24",
	[PropertyType.WAREHOUSE]: "#f87171",
	[PropertyType.FARM]: "#86efac",
	[PropertyType.OTHER]: "#cbd5e1",
};

const TYPE_LABELS: Record<string, string> = {
	[PropertyType.LAND]: "Land",
	[PropertyType.HOUSE]: "House",
	[PropertyType.APARTMENT]: "Apartment",
	[PropertyType.BUILDING]: "Building",
	[PropertyType.OFFICE]: "Office",
	[PropertyType.RETAIL]: "Retail",
	[PropertyType.WAREHOUSE]: "Warehouse",
	[PropertyType.FARM]: "Farm",
	[PropertyType.OTHER]: "Other",
};

interface PropertyTypeChartProps {
	properties: Property[];
}

export default function PropertyTypeChart({
	properties,
}: PropertyTypeChartProps) {
	const counts = properties.reduce<Record<string, number>>((acc, p) => {
		acc[p.propertyType] = (acc[p.propertyType] ?? 0) + 1;
		return acc;
	}, {});

	const data = Object.entries(counts).map(([type, count]) => ({
		name: TYPE_LABELS[type] ?? type.replace(/_/g, " "),
		value: count,
		color: TYPE_COLORS[type] ?? "#94a3b8",
	}));

	return (
		<ResponsiveContainer width="100%" height={260}>
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					innerRadius={55}
					outerRadius={90}
					paddingAngle={3}
					dataKey="value"
					strokeWidth={0}
				>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.color} />
					))}
				</Pie>
				<Tooltip
					contentStyle={{
						background: "var(--color-card)",
						border: "1px solid var(--color-border)",
						borderRadius: 12,
						fontSize: 12,
					}}
				/>
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 12 }}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
