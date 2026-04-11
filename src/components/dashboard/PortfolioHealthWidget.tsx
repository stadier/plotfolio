import { Property } from "@/types/property";
import { Shield } from "lucide-react";

interface PortfolioHealthWidgetProps {
	properties: Property[];
}

/** Calculate a simple portfolio health score (0-100) based on data completeness. */
function computeHealth(properties: Property[]): number {
	if (properties.length === 0) return 0;
	let total = 0;
	for (const p of properties) {
		let score = 0;
		if (p.name) score += 15;
		if (p.address) score += 15;
		if (p.coordinates?.lat && p.coordinates?.lng) score += 15;
		if ((p.documents?.length ?? 0) > 0) score += 20;
		if (p.currentValue) score += 15;
		if (p.surveyData?.coordinates && p.surveyData.coordinates.length >= 3)
			score += 20;
		total += score;
	}
	return Math.round(total / properties.length);
}

export default function PortfolioHealthWidget({
	properties,
}: PortfolioHealthWidgetProps) {
	const score = computeHealth(properties);

	const color =
		score >= 80
			? "text-green-600 dark:text-green-400"
			: score >= 50
				? "text-amber-600 dark:text-amber-400"
				: "text-red-500 dark:text-red-400";

	const ringColor =
		score >= 80
			? "stroke-green-500 dark:stroke-green-400"
			: score >= 50
				? "stroke-amber-500 dark:stroke-amber-400"
				: "stroke-red-500 dark:stroke-red-400";

	const label = score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs Work";

	// SVG donut
	const radius = 38;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference - (score / 100) * circumference;

	return (
		<div className="bg-card sz-card border border-border break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center sz-gap mb-3">
				<div className="sz-icon-box rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center">
					<Shield className="sz-icon text-emerald-600 dark:text-emerald-400" />
				</div>
				<span className="typo-caption font-semibold text-on-surface-variant">
					Portfolio Health
				</span>
			</div>

			<div className="flex items-center gap-4">
				{/* Donut ring */}
				<div className="relative w-20 h-20 shrink-0">
					<svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
						<circle
							cx="50"
							cy="50"
							r={radius}
							fill="none"
							stroke="var(--color-border)"
							strokeWidth="8"
						/>
						<circle
							cx="50"
							cy="50"
							r={radius}
							fill="none"
							className={ringColor}
							strokeWidth="8"
							strokeLinecap="round"
							strokeDasharray={circumference}
							strokeDashoffset={dashOffset}
							style={{ transition: "stroke-dashoffset 0.8s ease" }}
						/>
					</svg>
					<div className="absolute inset-0 flex items-center justify-center">
						<span className={`font-headline typo-stat font-extrabold ${color}`}>
							{score}
						</span>
					</div>
				</div>

				<div>
					<p className={`typo-body font-bold ${color}`}>{label}</p>
					<p className="typo-badge text-outline mt-0.5">
						Based on data completeness, documents, and survey boundaries
					</p>
				</div>
			</div>
		</div>
	);
}
