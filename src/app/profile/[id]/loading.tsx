import AppShell from "@/components/layout/AppShell";
import {
    ProfileHeaderSkeleton,
    PropertyGridSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<div className="p-6 space-y-6">
				<ProfileHeaderSkeleton />
				<PropertyGridSkeleton count={6} />
			</div>
		</AppShell>
	);
}
