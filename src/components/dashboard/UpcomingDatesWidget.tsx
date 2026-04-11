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
			"text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-500/20",
			"text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/20",
			"text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/20",
			"text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/20",
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
		<div className="bg-card sz-card border border-border break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center sz-gap mb-[var(--size-widget-header-mb)]">
				<div className="sz-icon-box rounded-full bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center">
					<Calendar className="sz-icon text-violet-600 dark:text-violet-400" />
				</div>
				<span className="typo-caption font-semibold text-on-surface-variant">
					Upcoming Dates
				</span>
			</div>
			<div className="space-y-3">
				{events.map((ev) => (
					<div key={ev.id} className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${ev.urgency}`}
						>
							<span className="typo-badge font-bold leading-none">
								{ev.dateStr.split(" ")[0]}
							</span>
							<span className="typo-badge font-medium uppercase leading-tight">
								{ev.dateStr.split(" ")[1]}
							</span>
						</div>
						<div className="min-w-0 flex-1">
							<p className="typo-caption font-semibold text-primary truncate">
								{ev.event}
							</p>
							<p className="typo-badge text-on-surface-variant truncate">
								{ev.name}
							</p>
						</div>
						<span className="typo-badge font-bold text-outline">
							{ev.daysOut}d
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
