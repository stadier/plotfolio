import { Property } from "@/types/property";
import { Shield } from "lucide-react";

interface DocumentCompletionWidgetProps {
	properties: Property[];
}

export default function DocumentCompletionWidget({
	properties,
}: DocumentCompletionWidgetProps) {
	const REQUIRED_DOCS = 3;
	const totalDocs = properties.reduce(
		(s, p) => s + (p.documents?.length ?? 0),
		0,
	);
	const overallPct = Math.min(
		Math.round((totalDocs / (properties.length * REQUIRED_DOCS)) * 100),
		100,
	);

	return (
		<div className="bg-white dark:bg-surface-container-low rounded-2xl border border-slate-200 dark:border-outline-variant p-5 break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center gap-2 mb-4">
				<div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-surface-container flex items-center justify-center">
					<Shield className="w-4 h-4 text-amber-600" />
				</div>
				<span className="text-xs font-semibold text-on-surface-variant">
					Doc Compliance
				</span>
			</div>
			{/* Overall score */}
			<div className="flex items-end gap-2 mb-4">
				<span className="font-headline text-3xl font-extrabold text-primary">
					{overallPct}%
				</span>
				<span className="text-[10px] text-on-surface-variant mb-1.5">
					complete
				</span>
			</div>
			{/* Per-property bars */}
			<div className="space-y-2.5">
				{properties.slice(0, 4).map((p) => {
					const pct = Math.min(
						Math.round(((p.documents?.length ?? 0) / REQUIRED_DOCS) * 100),
						100,
					);
					const barColor =
						pct >= 100
							? "bg-secondary"
							: pct >= 50
								? "bg-amber-400"
								: "bg-red-400";
					return (
						<div key={p.id}>
							<div className="flex items-center justify-between mb-1">
								<span className="text-[11px] font-medium text-primary truncate max-w-[140px]">
									{p.name}
								</span>
								<span className="text-[10px] text-on-surface-variant">
									{p.documents?.length ?? 0}/{REQUIRED_DOCS}
								</span>
							</div>
							<div className="h-1.5 bg-slate-100 dark:bg-surface-container rounded-full overflow-hidden">
								<div
									className={`h-full ${barColor} rounded-full transition-all duration-500`}
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
