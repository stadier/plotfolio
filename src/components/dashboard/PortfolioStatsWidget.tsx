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
		<div className="bg-card sz-card flex flex-col justify-between break-inside-avoid widget-card animate-fade-in-up">
			<div>
				<div className="flex items-center sz-gap mb-3">
					<div className="sz-icon-box rounded-full bg-slate-100 dark:bg-blue-500/20 flex items-center justify-center">
						<BarChart3 className="sz-icon text-blue-600 dark:text-blue-400" />
					</div>
					<span className="typo-caption font-semibold text-on-surface-variant">
						Portfolio Stats
					</span>
				</div>
				<span className="typo-caption text-on-surface-variant">Total Area</span>
				<p className="font-headline typo-stat font-extrabold text-primary">
					{(totalArea || 0).toLocaleString()} sqm
				</p>
			</div>
			<div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
				<span className="typo-caption text-on-surface-variant">Documents</span>
				<span className="typo-body font-bold text-primary">{docCount}</span>
			</div>
		</div>
	);
}
