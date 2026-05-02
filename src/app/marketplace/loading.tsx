import AppShell from "@/components/layout/AppShell";
import { MarketplacePageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<MarketplacePageSkeleton />
		</AppShell>
	);
}
