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
		<div className="max-w-xs bg-[#e8f5e3] dark:bg-surface-container-low rounded-2xl p-5 flex flex-col gap-3 card-hover animate-fade-in-up">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-full bg-white/70 dark:bg-surface-container flex items-center justify-center">
					<Icon className="w-4 h-4 text-secondary" />
				</div>
				<span className="text-xs font-semibold text-secondary">{label}</span>
			</div>
			<div className="flex items-end justify-between gap-3">
				<span className="font-headline text-2xl font-extrabold text-primary">
					{value}
				</span>
				<span className="text-xs font-bold text-secondary/70 mb-1">
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
