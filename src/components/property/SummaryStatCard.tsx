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
			<div className="w-full sm:w-60 max-w-xs bg-surface-container-lowest sz-radius-lg border border-border p-(--size-card-px) card-hover">
				<div className="flex items-center sz-gap mb-2">
					<Icon className="sz-icon text-secondary" />
					<span className="typo-badge font-bold text-slate-400 uppercase tracking-widest">
						{label}
					</span>
				</div>
				<div className="font-headline typo-stat font-extrabold text-primary">
					{value}
				</div>
			</div>
		);
	}

	const bg = iconColor?.bg ?? "bg-primary/10 dark:bg-primary/15";
	const text = iconColor?.text ?? "text-primary";

	return (
		<div className="max-w-xs bg-card border border-border sz-radius-lg px-(--size-card-px) py-(--size-btn-lg-py) flex items-center gap-3">
			<div
				className={`sz-icon-box-lg shrink-0 rounded-full ${bg} flex items-center justify-center`}
			>
				<Icon className={`w-5 h-5 ${text}`} />
			</div>
			<div>
				<div className="typo-caption text-on-surface-variant uppercase tracking-wider font-semibold">
					{label}
				</div>
				<div className="typo-section-title font-bold text-on-surface">
					{value}
				</div>
				{subtitle && (
					<div className="typo-badge text-on-surface-variant mt-0.5">
						{subtitle}
					</div>
				)}
			</div>
		</div>
	);
}
