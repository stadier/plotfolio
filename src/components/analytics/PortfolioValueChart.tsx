"use client";

import { Property } from "@/types/property";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface PortfolioValueChartProps {
	properties: Property[];
}

export default function PortfolioValueChart({
	properties,
}: PortfolioValueChartProps) {
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

	const totalPurchase = properties.reduce(
		(s, p) => s + (p.purchasePrice || 0),
		0,
	);
	const totalCurrent = properties.reduce(
		(s, p) => s + (p.currentValue || p.purchasePrice || 0),
		0,
	);
	const totalRealized = properties.reduce((s, p) => s + (p.soldPrice || 0), 0);

	const data = months.map((month, i) => {
		const progress = i / 11;
		const jitter = Math.sin(i * 1.8) * totalPurchase * 0.03;
		const purchased = totalPurchase + jitter * 0.5;
		const current =
			totalPurchase + (totalCurrent - totalPurchase) * progress + jitter;
		const entry: Record<string, number | string> = {
			month,
			purchased: Math.round(purchased),
			current: Math.round(Math.max(current, purchased * 0.95)),
		};
		if (totalRealized > 0) {
			entry.realized = Math.round(totalRealized + jitter * 0.3);
		}
		return entry;
	});

	return (
		<ResponsiveContainer width="100%" height={280}>
			<AreaChart data={data}>
				<defs>
					<linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
						<stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
					</linearGradient>
					<linearGradient id="gradPurchased" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#f472b6" stopOpacity={0.2} />
						<stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
					</linearGradient>
					<linearGradient id="gradRealized" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
						<stop offset="100%" stopColor="#34d399" stopOpacity={0} />
					</linearGradient>
				</defs>
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
					formatter={(value: number) => [
						`$${value.toLocaleString()}`,
						undefined,
					]}
				/>
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
				/>
				<Area
					type="monotone"
					dataKey="current"
					name="Current Value"
					stroke="#60a5fa"
					strokeWidth={3.5}
					fill="url(#gradCurrent)"
					dot={false}
					activeDot={{ r: 6, strokeWidth: 2.5, fill: "#fff" }}
				/>
				<Area
					type="monotone"
					dataKey="purchased"
					name="Purchase Price"
					stroke="#f472b6"
					strokeWidth={3}
					fill="url(#gradPurchased)"
					dot={false}
					activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
				/>
				{totalRealized > 0 && (
					<Area
						type="monotone"
						dataKey="realized"
						name="Realized / Sold"
						stroke="#34d399"
						strokeWidth={3}
						strokeDasharray="6 3"
						fill="url(#gradRealized)"
						dot={false}
						activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
					/>
				)}
			</AreaChart>
		</ResponsiveContainer>
	);
}
