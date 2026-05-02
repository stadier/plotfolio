import AppShell from "@/components/layout/AppShell";
import { FormSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="sz-page">
				<h1 className="font-headline typo-page-title font-bold text-on-surface mb-1">
					Settings
				</h1>
				<p className="typo-body text-on-surface-variant mb-6">
					Manage your account, appearance, and preferences.
				</p>
				<div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
					<aside className="w-full md:w-56 shrink-0 space-y-1">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="skeleton h-8 w-full rounded-md" />
						))}
					</aside>
					<div className="flex-1 min-w-0 w-full max-w-2xl">
						<FormSkeleton rows={6} />
					</div>
				</div>
			</div>
		</AppShell>
	);
}
