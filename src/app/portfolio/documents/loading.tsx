import AppShell from "@/components/layout/AppShell";
import { DocumentsPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell>
			<DocumentsPageSkeleton />
		</AppShell>
	);
}
