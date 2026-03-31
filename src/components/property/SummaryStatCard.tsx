import { type ElementType } from "react";

interface SummaryStatCardProps {
	label: string;
	value: string;
	icon: ElementType;
	subtitle?: string;
	/** Icon accent colour — Tailwind bg + text classes for the circle and icon. */
	iconColor?: { bg: string; text: string };
	/** "default" = icon‑circle left layout (marketplace style). "classic" = stacked layout. */
	variant?: "default" | "classic";
}

export default function SummaryStatCard({
	label,
	value,
	icon: Icon,
	subtitle,
	iconColor,
	variant = "default",
}: SummaryStatCardProps) {
	if (variant === "classic") {
		return (
			<div className="w-full sm:w-60 max-w-xs bg-surface-container-lowest rounded-xl border border-border p-5 card-hover">
				<div className="flex items-center gap-2 mb-2">
					<Icon className="w-4 h-4 text-secondary" />
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						{label}
					</span>
				</div>
				<div className="font-headline text-2xl font-extrabold text-primary">
					{value}
				</div>
			</div>
		);
	}

	const bg = iconColor?.bg ?? "bg-primary/10 dark:bg-primary/15";
	const text = iconColor?.text ?? "text-primary";

	return (
		<div className="max-w-xs bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-3">
			<div
				className={`h-10 w-10 shrink-0 rounded-full ${bg} flex items-center justify-center`}
			>
				<Icon className={`w-5 h-5 ${text}`} />
			</div>
			<div>
				<div className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
					{label}
				</div>
				<div className="text-lg font-bold text-on-surface">{value}</div>
				{subtitle && (
					<div className="text-[10px] text-on-surface-variant mt-0.5">
						{subtitle}
					</div>
				)}
			</div>
		</div>
	);
}
