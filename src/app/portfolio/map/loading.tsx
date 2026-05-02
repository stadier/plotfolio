import AppShell from "@/components/layout/AppShell";
import { MapPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell scrollable={false}>
			<MapPageSkeleton />
		</AppShell>
	);
}
