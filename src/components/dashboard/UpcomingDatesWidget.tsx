import { Property } from "@/types/property";
import { Calendar } from "lucide-react";

interface UpcomingDatesWidgetProps {
	properties: Property[];
}

export default function UpcomingDatesWidget({
	properties,
}: UpcomingDatesWidgetProps) {
	const events = properties.slice(0, 4).map((p, i) => {
		const types = [
			"Survey renewal",
			"Tax payment due",
			"Insurance renewal",
			"Lease review",
		];
		const daysOut = [3, 12, 24, 45];
		const urgency = [
			"text-red-500 bg-red-50",
			"text-amber-600 bg-amber-50",
			"text-blue-600 bg-blue-50",
			"text-slate-500 bg-slate-50",
		];
		const date = new Date();
		date.setDate(date.getDate() + daysOut[i]);
		return {
			id: p.id,
			name: p.name,
			event: types[i],
			dateStr: date.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
			}),
			daysOut: daysOut[i],
			urgency: urgency[i],
		};
	});

	return (
		<div className="bg-white dark:bg-surface-container-low rounded-2xl border border-slate-200 dark:border-outline-variant p-5 break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center gap-2 mb-4">
				<div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-surface-container flex items-center justify-center">
					<Calendar className="w-4 h-4 text-violet-600" />
				</div>
				<span className="text-xs font-semibold text-on-surface-variant">
					Upcoming Dates
				</span>
			</div>
			<div className="space-y-3">
				{events.map((ev) => (
					<div key={ev.id} className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${ev.urgency}`}
						>
							<span className="text-[10px] font-bold leading-none">
								{ev.dateStr.split(" ")[0]}
							</span>
							<span className="text-[8px] font-medium uppercase leading-tight">
								{ev.dateStr.split(" ")[1]}
							</span>
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[11px] font-semibold text-primary truncate">
								{ev.event}
							</p>
							<p className="text-[10px] text-on-surface-variant truncate">
								{ev.name}
							</p>
						</div>
						<span className="text-[9px] font-bold text-outline">
							{ev.daysOut}d
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
