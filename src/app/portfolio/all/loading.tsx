import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import {
	BreadcrumbPageHeader,
	PropertyGridSkeleton,
	ToolbarSkeleton,
} from "@/components/ui/skeletons";
import { Plus } from "lucide-react";

export default function Loading() {
	return (
		<AppShell hideAddProperty>
			<BreadcrumbPageHeader
				back={<BackButton fallbackHref="/portfolio" label="Dashboard" />}
				title="Portfolios"
				right={
					<PrimaryButton href="/portfolio/new">
						<Plus className="w-4 h-4" />
						New portfolio
					</PrimaryButton>
				}
			/>
			<div className="px-4 sm:px-8 pt-6 pb-16 space-y-5">
				<ToolbarSkeleton filterCount={1} />
				<PropertyGridSkeleton count={8} />
			</div>
		</AppShell>
	);
}
