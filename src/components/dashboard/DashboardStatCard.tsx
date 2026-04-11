import { type ElementType } from "react";

interface DashboardStatCardProps {
	label: string;
	value: string;
	percentage: number;
	icon: ElementType;
}

export default function DashboardStatCard({
	label,
	value,
	percentage,
	icon: Icon,
}: DashboardStatCardProps) {
	return (
		<div className="max-w-xs bg-[#e8f5e3] dark:bg-surface-container-low sz-card flex flex-col gap-3 card-hover animate-fade-in-up">
			<div className="flex items-center sz-gap">
				<div className="sz-icon-box rounded-full bg-white/70 dark:bg-surface-container flex items-center justify-center">
					<Icon className="sz-icon text-secondary" />
				</div>
				<span className="typo-caption font-semibold text-secondary">
					{label}
				</span>
			</div>
			<div className="flex items-end justify-between gap-3">
				<span className="font-headline typo-stat font-extrabold text-primary">
					{value}
				</span>
				<span className="typo-caption font-bold text-secondary/70 mb-1">
					{percentage}%
				</span>
			</div>
			<div className="w-full h-1.5 bg-white/60 dark:bg-surface-container rounded-full overflow-hidden">
				<div
					className="h-full bg-secondary rounded-full transition-all duration-700"
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
		</div>
	);
}
