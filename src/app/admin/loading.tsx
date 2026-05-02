import AppShell from "@/components/layout/AppShell";
import {
    PageHeadingSkeleton,
    SummaryStatRowSkeleton,
    TableRowsSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-5">
				<PageHeadingSkeleton />
				<SummaryStatRowSkeleton count={4} />
				<TableRowsSkeleton rows={8} columns={5} />
			</div>
		</AppShell>
	);
}
