import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import { FormSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="bg-background border-b border-border px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<BackButton fallbackHref="/settings" label="Settings" />
					<span className="text-outline">/</span>
					<h1 className="font-headline text-lg font-bold text-on-surface">
						Verification
					</h1>
				</div>
			</div>
			<div className="px-4 sm:px-8 pt-6 pb-16 max-w-2xl">
				<FormSkeleton rows={4} />
			</div>
		</AppShell>
	);
}
