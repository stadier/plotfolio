import AppShell from "@/components/layout/AppShell";
import { CreatePropertyFormSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<CreatePropertyFormSkeleton />
		</AppShell>
	);
}
