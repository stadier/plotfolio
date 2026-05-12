import AppShell from "@/components/layout/AppShell";
import BackButton from "@/components/ui/BackButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { BreadcrumbPageHeader } from "@/components/ui/skeletons";
import { Plus } from "lucide-react";

// Render the static header during the route transition. The page itself
// handles a delayed loading indicator so brand-new accounts with no
// portfolios resolve instantly without a spinner flash.
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
		</AppShell>
	);
}
