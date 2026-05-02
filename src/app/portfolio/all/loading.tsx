import AppShell from "@/components/layout/AppShell";
import {
    PageHeadingSkeleton,
    PropertyGridSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-5">
				<PageHeadingSkeleton />
				<PropertyGridSkeleton count={8} />
			</div>
		</AppShell>
	);
}
