import AppShell from "@/components/layout/AppShell";
import { PropertyDetailSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6">
				<PropertyDetailSkeleton />
			</div>
		</AppShell>
	);
}
