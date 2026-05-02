import AppShell from "@/components/layout/AppShell";
import { FormSkeleton, PageHeadingSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-5">
				<PageHeadingSkeleton />
				<FormSkeleton rows={6} />
			</div>
		</AppShell>
	);
}
