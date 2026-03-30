import { Property } from "@/types/property";
import { MapPin, MessageSquare } from "lucide-react";
import { getStatusBadge } from "./helpers";

interface RecentActivityWidgetProps {
	properties: Property[];
	onSelect: (id: string) => void;
}

export default function RecentActivityWidget({
	properties,
	onSelect,
}: RecentActivityWidgetProps) {
	return (
		<div className="bg-white dark:bg-surface-container-low rounded-2xl border border-slate-200 dark:border-outline-variant p-5 break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center gap-2 mb-4">
				<div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-container flex items-center justify-center">
					<MessageSquare className="w-4 h-4 text-primary" />
				</div>
				<span className="text-xs font-semibold text-on-surface-variant">
					Recent Activity
				</span>
			</div>
			<div className="space-y-3">
				{properties.slice(0, 3).map((p) => {
					const badge = getStatusBadge(p.status);
					return (
						<div
							key={p.id}
							className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-container -mx-2 px-2 py-1.5 rounded-lg transition-colors"
							onClick={() => onSelect(p.id)}
						>
							<div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-surface-container flex items-center justify-center shrink-0">
								<MapPin className="w-3 h-3 text-slate-400 dark:text-on-surface-variant" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-semibold text-primary truncate">
									{p.name}
								</p>
							</div>
							<span
								className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badge.cls}`}
							>
								{badge.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
