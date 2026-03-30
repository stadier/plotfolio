import { Property, PropertyStatus } from "@/types/property";
import { BarChart3 } from "lucide-react";

const STATUS_COLORS: Record<
	PropertyStatus,
	{ bg: string; text: string; label: string }
> = {
	[PropertyStatus.OWNED]: {
		bg: "bg-secondary",
		text: "text-secondary",
		label: "Owned",
	},
	[PropertyStatus.FOR_SALE]: {
		bg: "bg-primary",
		text: "text-primary",
		label: "For Sale",
	},
	[PropertyStatus.DEVELOPMENT]: {
		bg: "bg-amber-500",
		text: "text-amber-600",
		label: "Development",
	},
	[PropertyStatus.UNDER_CONTRACT]: {
		bg: "bg-orange-500",
		text: "text-orange-600",
		label: "Contract",
	},
	[PropertyStatus.RENTED]: {
		bg: "bg-purple-500",
		text: "text-purple-600",
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
		<div className="bg-white dark:bg-surface-container-low rounded-2xl border border-slate-200 dark:border-outline-variant p-5 break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center gap-2 mb-4">
				<div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-container flex items-center justify-center">
					<BarChart3 className="w-4 h-4 text-primary" />
				</div>
				<span className="text-xs font-semibold text-on-surface-variant">
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
								<span className="text-xs text-on-surface-variant">
									{color?.label ?? status}
								</span>
							</div>
							<span
								className={`text-xs font-bold ${color?.text ?? "text-slate-500"}`}
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
