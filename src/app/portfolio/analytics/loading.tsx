import AppShell from "@/components/layout/AppShell";
import { AnalyticsPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<AnalyticsPageSkeleton />
		</AppShell>
	);
}
