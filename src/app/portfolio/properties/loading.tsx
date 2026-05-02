import AppShell from "@/components/layout/AppShell";
import { PageHero, PropertiesPageSkeleton } from "@/components/ui/skeletons";
import { Home } from "lucide-react";

export default function Loading() {
	return (
		<AppShell>
			<PropertiesPageSkeleton
				header={
					<PageHero
						icon={Home}
						title="My Properties"
						description="Manage your properties — documents, valuations, and transaction records"
					/>
				}
			/>
		</AppShell>
	);
}
