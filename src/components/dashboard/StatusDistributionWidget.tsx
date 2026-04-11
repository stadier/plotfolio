import { Property, PropertyStatus } from "@/types/property";
import { BarChart3 } from "lucide-react";

const STATUS_COLORS: Record<
	PropertyStatus,
	{ bg: string; text: string; label: string }
> = {
	[PropertyStatus.OWNED]: {
		bg: "bg-green-600 dark:bg-green-400",
		text: "text-green-600 dark:text-green-400",
		label: "Owned",
	},
	[PropertyStatus.FOR_SALE]: {
		bg: "bg-blue-600 dark:bg-blue-400",
		text: "text-blue-600 dark:text-blue-400",
		label: "For Sale",
	},
	[PropertyStatus.DEVELOPMENT]: {
		bg: "bg-amber-500 dark:bg-amber-400",
		text: "text-amber-600 dark:text-amber-400",
		label: "Development",
	},
	[PropertyStatus.UNDER_CONTRACT]: {
		bg: "bg-orange-500 dark:bg-orange-400",
		text: "text-orange-600 dark:text-orange-300",
		label: "Contract",
	},
	[PropertyStatus.RENTED]: {
		bg: "bg-purple-500 dark:bg-purple-400",
		text: "text-purple-600 dark:text-purple-400",
		label: "Rented",
	},
};

interface StatusDistributionWidgetProps {
	properties: Property[];
}

export default function StatusDistributionWidget({
	properties,
}: StatusDistributionWidgetProps) {
	const counts = properties.reduce<Record<string, number>>((acc, p) => {
		acc[p.status] = (acc[p.status] ?? 0) + 1;
		return acc;
	}, {});
	const total = properties.length;

	return (
		<div className="bg-card sz-card border border-border break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center sz-gap mb-[var(--size-widget-header-mb)]">
				<div className="sz-icon-box rounded-full bg-slate-100 dark:bg-indigo-500/20 flex items-center justify-center">
					<BarChart3 className="sz-icon text-indigo-600 dark:text-indigo-400" />
				</div>
				<span className="typo-caption font-semibold text-on-surface-variant">
					Status Breakdown
				</span>
			</div>
			{/* Stacked bar */}
			<div className="flex h-3 rounded-full overflow-hidden mb-4">
				{Object.entries(counts).map(([status, count]) => {
					const color = STATUS_COLORS[status as PropertyStatus];
					return (
						<div
							key={status}
							className={`${color?.bg ?? "bg-slate-300"} first:rounded-l-full last:rounded-r-full`}
							style={{ width: `${(count / total) * 100}%` }}
						/>
					);
				})}
			</div>
			{/* Legend */}
			<div className="space-y-2">
				{Object.entries(counts).map(([status, count]) => {
					const color = STATUS_COLORS[status as PropertyStatus];
					return (
						<div key={status} className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div
									className={`w-2.5 h-2.5 rounded-full ${color?.bg ?? "bg-slate-300"}`}
								/>
								<span className="typo-caption text-on-surface-variant">
									{color?.label ?? status}
								</span>
							</div>
							<span
								className={`typo-caption font-bold ${color?.text ?? "text-slate-500"}`}
							>
								{count}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
