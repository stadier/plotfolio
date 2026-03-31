import { BarChart3 } from "lucide-react";

interface PortfolioStatsWidgetProps {
	totalArea: number;
	docCount: number;
}

export default function PortfolioStatsWidget({
	totalArea,
	docCount,
}: PortfolioStatsWidgetProps) {
	return (
		<div className="bg-card rounded-2xl border border-border p-5 flex flex-col justify-between break-inside-avoid widget-card animate-fade-in-up">
			<div>
				<div className="flex items-center gap-2 mb-3">
					<div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-blue-500/20 flex items-center justify-center">
						<BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
					</div>
					<span className="text-xs font-semibold text-on-surface-variant">
						Portfolio Stats
					</span>
				</div>
				<span className="text-xs text-on-surface-variant">Total Area</span>
				<p className="font-headline text-2xl font-extrabold text-primary">
					{(totalArea || 0).toLocaleString()} sqm
				</p>
			</div>
			<div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
				<span className="text-xs text-on-surface-variant">Documents</span>
				<span className="text-sm font-bold text-primary">{docCount}</span>
			</div>
		</div>
	);
}
