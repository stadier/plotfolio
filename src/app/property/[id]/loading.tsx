import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { PropertyDetailSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell scrollable={false}>
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 z-10">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<BackButton fallbackHref="/marketplace" label="Marketplace" />
					<span className="text-outline-variant hidden sm:inline">/</span>
					<div className="skeleton h-4 w-32 rounded-md" />
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				<PropertyDetailSkeleton />
			</div>
		</AppShell>
	);
}
