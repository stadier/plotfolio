"use client";

import { Property } from "@/types/property";
import {
	CartesianGrid,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";

interface PriceVsAreaScatterProps {
	properties: Property[];
}

export default function PriceVsAreaScatter({
	properties,
}: PriceVsAreaScatterProps) {
	const data = properties
		.filter((p) => p.area && p.purchasePrice)
		.map((p) => ({
			area: p.area,
			price: p.purchasePrice,
			name: p.name,
		}));

	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[260px] text-xs text-outline">
				Not enough data for scatter plot
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={280}>
			<ScatterChart>
				<CartesianGrid
					strokeDasharray="3 3"
					stroke="var(--chart-grid)"
				/>
				<XAxis
					dataKey="area"
					type="number"
					name="Area"
					unit=" sqm"
					tick={{ fontSize: 11, fill: "var(--chart-label)" }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) =>
						v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
					}
				/>
				<YAxis
					dataKey="price"
					type="number"
					name="Price"
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
				<ZAxis range={[60, 200]} />
				<Tooltip
					contentStyle={{
						background: "var(--color-card)",
						border: "1px solid var(--color-border)",
						borderRadius: 12,
						fontSize: 12,
					}}
					formatter={(value: number, name: string) => {
						if (name === "Price")
							return [`$${value.toLocaleString()}`, name];
						if (name === "Area") return [`${value.toLocaleString()} sqm`, name];
						return [value, name];
					}}
				/>
				<Scatter
					data={data}
					fill="#34d399"
					strokeWidth={0}
					fillOpacity={0.7}
				/>
			</ScatterChart>
		</ResponsiveContainer>
	);
}
