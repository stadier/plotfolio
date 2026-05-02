import AppShell from "@/components/layout/AppShell";
import { PropertiesPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<PropertiesPageSkeleton />
		</AppShell>
	);
}
