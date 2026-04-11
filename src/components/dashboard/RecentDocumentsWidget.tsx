import { Property } from "@/types/property";
import { FileText } from "lucide-react";

interface RecentDocumentsWidgetProps {
	properties: Property[];
}

export default function RecentDocumentsWidget({
	properties,
}: RecentDocumentsWidgetProps) {
	// Flatten and sort documents by upload date (newest first)
	const docs = properties
		.flatMap((p) =>
			(p.documents ?? []).map((d) => ({
				...d,
				propertyName: p.name,
				propertyId: p.id,
			})),
		)
		.sort(
			(a, b) =>
				new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
		)
		.slice(0, 5);

	const typeColors: Record<string, string> = {
		deed: "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
		title:
			"bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
		survey:
			"bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
		contract:
			"bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
		insurance:
			"bg-cyan-50 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
	};

	return (
		<div className="bg-card sz-card border border-border break-inside-avoid widget-card animate-fade-in-up">
			<div className="flex items-center sz-gap mb-(--size-widget-header-mb)">
				<div className="sz-icon-box rounded-full bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center">
					<FileText className="sz-icon text-amber-600 dark:text-amber-400" />
				</div>
				<span className="typo-caption font-semibold text-on-surface-variant">
					Recent Documents
				</span>
			</div>

			{docs.length === 0 ? (
				<p className="typo-badge text-outline">No documents uploaded yet.</p>
			) : (
				<div className="space-y-2.5">
					{docs.map((doc) => {
						const colorClass =
							typeColors[doc.type] ??
							"bg-slate-50 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
						const dateStr = new Date(doc.uploadDate).toLocaleDateString(
							"en-GB",
							{ day: "numeric", month: "short" },
						);
						return (
							<div key={doc.id} className="flex items-center gap-3">
								<div
									className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
								>
									<FileText className="w-3.5 h-3.5" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="typo-caption font-semibold text-primary truncate">
										{doc.name}
									</p>
									<p className="typo-badge text-outline truncate">
										{doc.propertyName}
									</p>
								</div>
								<span className="typo-badge font-bold text-on-surface-variant shrink-0">
									{dateStr}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
