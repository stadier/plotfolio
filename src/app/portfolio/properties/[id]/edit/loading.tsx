import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { CreatePropertyFormSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			{/* Real page header — only the property name shimmers */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Back" />
					<span className="text-outline hidden sm:inline">/</span>
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-headline text-base sm:text-lg font-bold text-on-surface">
							Edit:
						</span>
						<div className="skeleton h-4 w-40 rounded-md" />
					</div>
				</div>
			</div>
			<CreatePropertyFormSkeleton />
		</AppShell>
	);
}
