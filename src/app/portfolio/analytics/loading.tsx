import AppShell from "@/components/layout/AppShell";
import { AnalyticsPageSkeleton, PageHero } from "@/components/ui/skeletons";
import { BarChart3 } from "lucide-react";

export default function Loading() {
	return (
		<AppShell>
			<AnalyticsPageSkeleton
				header={
					<PageHero
						icon={BarChart3}
						title="Analytics"
						description="Portfolio performance, distribution, and insights"
					/>
				}
			/>
		</AppShell>
	);
}
