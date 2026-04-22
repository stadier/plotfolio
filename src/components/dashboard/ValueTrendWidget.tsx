import { formatCurrencyCompact } from "@/lib/utils";
import { Property } from "@/types/property";
import { CheckCircle2 } from "lucide-react";

interface ValueTrendWidgetProps {
	properties: Property[];
}

/** Build a smooth cubic-bezier SVG path through the given points. */
function smoothPath(pts: { x: number; y: number }[]): string {
	if (pts.length < 2) return "";
	let d = `M${pts[0].x},${pts[0].y}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(i - 1, 0)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(i + 2, pts.length - 1)];
		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
	}
	return d;
}

export default function ValueTrendWidget({
	properties,
}: ValueTrendWidgetProps) {
	const baseValue = properties.reduce((s, p) => s + (p.purchasePrice || 0), 0);
	const currentValue = properties.reduce(
		(s, p) => s + (p.currentValue || p.purchasePrice || 0),
		0,
	);

	const growthPct =
		baseValue > 0
			? (((currentValue - baseValue) / baseValue) * 100).toFixed(2)
			: "0";
	const isPositive = Number(growthPct) >= 0;

	// Simulated 12-month trend
	const step = (currentValue - baseValue) / 11;
	const values = Array.from({ length: 12 }, (_, i) => {
		const wave =
			Math.sin(i * 1.8) * step * 0.35 + Math.sin(i * 0.7) * step * 0.2;
		return baseValue + step * i + wave;
	});
	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min || 1;

	const svgW = 400;
	const svgH = 72;
	const pad = 2;
	const pts = values.map((v, i) => ({
		x: pad + (i / 11) * (svgW - pad * 2),
		y: svgH - pad - ((v - min) / range) * (svgH - pad * 2 - 4),
	}));
	const curvePath = smoothPath(pts);
	const fillPath = `${curvePath} L${pts[pts.length - 1].x},${svgH} L${pts[0].x},${svgH} Z`;

	return (
		<div className="bg-card sz-card border border-border widget-card animate-fade-in-up overflow-hidden p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<h4 className="font-headline text-sm font-bold text-on-surface">
						Balance
					</h4>
					<span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 typo-badge font-semibold">
						<CheckCircle2 className="w-3.5 h-3.5" />
						On track
					</span>
				</div>
			</div>

			{/* Metrics row */}
			<div className="flex items-start gap-6 mb-3">
				<div>
					<p className="typo-badge text-outline font-medium">Growth</p>
					<div className="flex items-center gap-2">
						<span className="font-headline text-lg font-extrabold text-on-surface">
							{growthPct}%
						</span>
						<span
							className={`typo-badge font-bold px-1.5 py-0.5 rounded-md ${
								isPositive
									? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
									: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
							}`}
						>
							{isPositive ? "+" : ""}
							{growthPct}%
						</span>
					</div>
				</div>
				<div>
					<p className="typo-badge text-outline font-medium">Value</p>
					<div className="flex items-center gap-2">
						<span className="font-headline text-lg font-extrabold text-on-surface">
							{formatCurrencyCompact(currentValue)}
						</span>
					</div>
				</div>
			</div>

			{/* Smooth area chart */}
			<svg
				viewBox={`0 0 ${svgW} ${svgH}`}
				className="w-full h-28 -mb-[var(--size-card-py)] -mx-[var(--size-card-px)]"
				style={{ width: "calc(100% + 2 * var(--size-card-px))" }}
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id="vt-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.03" />
					</linearGradient>
				</defs>
				<path d={fillPath} fill="url(#vt-fill)" />
				<path
					d={curvePath}
					fill="none"
					stroke="#8b5cf6"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}
