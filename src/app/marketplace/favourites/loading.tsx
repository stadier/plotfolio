import AppShell from "@/components/layout/AppShell";
import { MarketplaceCardSkeleton } from "@/components/ui/skeletons";
import { Heart } from "lucide-react";

export default function Loading() {
	return (
		<AppShell>
			<div className="sz-page max-w-6xl space-y-5">
				<div className="mb-2">
					<div className="flex items-center gap-3 mb-2">
						<Heart className="w-6 h-6 text-red-500" />
						<h1 className="text-2xl font-bold font-headline text-on-surface">
							Favourites
						</h1>
					</div>
					<div className="skeleton h-3 w-32 rounded-md" />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<MarketplaceCardSkeleton key={i} />
					))}
				</div>
			</div>
		</AppShell>
	);
}
