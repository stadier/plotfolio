import AppShell from "@/components/layout/AppShell";
import {
	SummaryStatRowSkeleton,
	TableRowsSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="sz-page space-y-5">
				<h1 className="font-headline text-sm font-semibold text-primary">
					Admin
				</h1>
				<SummaryStatRowSkeleton count={4} />
				<TableRowsSkeleton rows={8} columns={5} />
			</div>
		</AppShell>
	);
}
