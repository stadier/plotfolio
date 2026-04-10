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
	[PropertyType.RESIDENTIAL]: "#60a5fa",
	[PropertyType.COMMERCIAL]: "#f472b6",
	[PropertyType.INDUSTRIAL]: "#fbbf24",
	[PropertyType.AGRICULTURAL]: "#34d399",
	[PropertyType.VACANT_LAND]: "#a78bfa",
	[PropertyType.MIXED_USE]: "#fb923c",
};

const TYPE_LABELS: Record<string, string> = {
	[PropertyType.RESIDENTIAL]: "Residential",
	[PropertyType.COMMERCIAL]: "Commercial",
	[PropertyType.INDUSTRIAL]: "Industrial",
	[PropertyType.AGRICULTURAL]: "Agricultural",
	[PropertyType.VACANT_LAND]: "Vacant Land",
	[PropertyType.MIXED_USE]: "Mixed Use",
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
