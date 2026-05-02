import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import {
	BreadcrumbPageHeader,
	TableRowsSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<BreadcrumbPageHeader
				back={<BackButton fallbackHref="/portfolio" label="Dashboard" />}
				title="Team"
			/>
			<div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-16 max-w-3xl space-y-5">
				<TableRowsSkeleton rows={6} columns={4} />
			</div>
		</AppShell>
	);
}
