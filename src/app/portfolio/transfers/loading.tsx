import AppShell from "@/components/layout/AppShell";
import { TableRowsSkeleton } from "@/components/ui/skeletons";
import { Send } from "lucide-react";

export default function Loading() {
	return (
		<AppShell>
			<div className="sz-page max-w-3xl space-y-5">
				{/* Real header — title is static */}
				<div className="flex items-center gap-3 mb-2">
					<Send className="w-6 h-6 text-primary" />
					<div>
						<h1 className="font-headline text-lg font-semibold text-on-surface">
							Transfers
						</h1>
						<p className="text-sm text-on-surface-variant">
							Ownership transfers sent to or received by you
						</p>
					</div>
				</div>
				<TableRowsSkeleton rows={6} columns={5} />
			</div>
		</AppShell>
	);
}
