import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { CreatePropertyFormSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			{/* Real page header — only the generated property name shimmers */}
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3 min-w-0">
					<BackButton fallbackHref="/portfolio/properties" label="Properties" />
					<span className="text-outline">/</span>
					<div className="skeleton h-4 w-40 rounded-md" />
				</div>
			</div>
			<CreatePropertyFormSkeleton />
		</AppShell>
	);
}
