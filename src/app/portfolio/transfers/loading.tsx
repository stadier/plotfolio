import AppShell from "@/components/layout/AppShell";
import {
    PageHeadingSkeleton,
    TableRowsSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-5">
				<PageHeadingSkeleton />
				<TableRowsSkeleton rows={6} columns={5} />
			</div>
		</AppShell>
	);
}
