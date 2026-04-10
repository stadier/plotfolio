"use client";

import { Property, PropertyCondition } from "@/types/property";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

const CONDITION_COLORS: Record<string, string> = {
	[PropertyCondition.BUSH]: "#78716c",
	[PropertyCondition.CLEARED]: "#a3e635",
	[PropertyCondition.FOUNDATION]: "#fbbf24",
	[PropertyCondition.HAS_STRUCTURE]: "#60a5fa",
	[PropertyCondition.FENCED]: "#34d399",
	[PropertyCondition.PAVED]: "#94a3b8",
	[PropertyCondition.WATERLOGGED]: "#38bdf8",
	[PropertyCondition.ROCKY]: "#d6d3d1",
	[PropertyCondition.UNDER_CONSTRUCTION]: "#fb923c",
	[PropertyCondition.FINISHED]: "#22c55e",
	[PropertyCondition.RENOVATED]: "#a78bfa",
	[PropertyCondition.NEEDS_REPAIR]: "#ef4444",
};

interface ConditionBreakdownChartProps {
	properties: Property[];
}

export default function ConditionBreakdownChart({
	properties,
}: ConditionBreakdownChartProps) {
	const counts: Record<string, number> = {};
	for (const p of properties) {
		for (const c of p.conditions ?? []) {
			counts[c] = (counts[c] ?? 0) + 1;
		}
	}

	const data = Object.entries(counts)
		.map(([condition, count]) => ({
			name: condition
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
			value: count,
			color: CONDITION_COLORS[condition] ?? "#94a3b8",
		}))
		.sort((a, b) => b.value - a.value);

	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[260px] text-xs text-outline">
				No condition data available
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={260}>
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					outerRadius={90}
					paddingAngle={2}
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
					wrapperStyle={{ fontSize: 11 }}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
