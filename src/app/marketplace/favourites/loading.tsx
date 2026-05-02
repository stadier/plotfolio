import AppShell from "@/components/layout/AppShell";
import {
    MarketplaceCardSkeleton,
    PageHeadingSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-5">
				<PageHeadingSkeleton />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<MarketplaceCardSkeleton key={i} />
					))}
				</div>
			</div>
		</AppShell>
	);
}
