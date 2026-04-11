import { Property } from "@/types/property";
import { TrendingUp } from "lucide-react";

interface ValueTrendWidgetProps {
	properties: Property[];
}

export default function ValueTrendWidget({
	properties,
}: ValueTrendWidgetProps) {
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
	const baseValue = properties.reduce((s, p) => s + (p.purchasePrice || 0), 0);
	const currentValue = properties.reduce(
		(s, p) => s + (p.currentValue || p.purchasePrice || 0),
		0,
	);
	const step = (currentValue - baseValue) / 11;
	const points = Array.from({ length: 12 }, (_, i) => {
		const jitter = Math.sin(i * 2.1) * step * 0.3;
		return baseValue + step * i + jitter;
	});
	const max = Math.max(...points);
	const min = Math.min(...points);
	const range = max - min || 1;

	const svgW = 260;
	const svgH = 80;
	const pad = 4;
	const pathPoints = points.map((v, i) => {
		const x = pad + (i / 11) * (svgW - pad * 2);
		const y = svgH - pad - ((v - min) / range) * (svgH - pad * 2);
		return `${x},${y}`;
	});

	const growthPct =
		baseValue > 0
			? (((currentValue - baseValue) / baseValue) * 100).toFixed(1)
			: "0";

	return (
		<div className="bg-card sz-card border border-border flex flex-col justify-between h-full widget-card animate-fade-in-up">
			<div>
				<div className="flex items-center justify-between mb-1">
					<div className="flex items-center sz-gap">
						<div className="sz-icon-box rounded-full bg-emerald-50 dark:bg-green-500/20 flex items-center justify-center">
							<TrendingUp className="sz-icon text-green-600 dark:text-green-400" />
						</div>
						<span className="typo-caption font-semibold text-on-surface-variant">
							Portfolio Trend
						</span>
					</div>
					<span className="typo-caption font-bold text-green-600 dark:text-green-400">
						+{growthPct}%
					</span>
				</div>
				<p className="typo-badge text-on-surface-variant mb-3">
					12-month value trend
				</p>
			</div>
			{/* SVG sparkline */}
			<svg
				viewBox={`0 0 ${svgW} ${svgH}`}
				className="w-full h-20"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.2" />
						<stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0" />
					</linearGradient>
				</defs>
				<polygon
					points={`${pad},${svgH - pad} ${pathPoints.join(" ")} ${svgW - pad},${svgH - pad}`}
					fill="url(#trendFill)"
				/>
				<polyline
					points={pathPoints.join(" ")}
					fill="none"
					stroke="var(--chart-line)"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="animate-draw-line"
				/>
				{/* End dot */}
				<circle
					cx={pathPoints[11]?.split(",")[0]}
					cy={pathPoints[11]?.split(",")[1]}
					r="3"
					fill="var(--chart-line)"
				/>
			</svg>
			{/* Month labels */}
			<div className="flex justify-between mt-1">
				{[0, 3, 6, 9, 11].map((i) => (
					<span key={i} className="typo-badge text-outline font-medium">
						{months[i]}
					</span>
				))}
			</div>
		</div>
	);
}
