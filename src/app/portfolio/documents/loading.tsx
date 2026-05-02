import AppShell from "@/components/layout/AppShell";
import { DocumentsPageSkeleton, PageHero } from "@/components/ui/skeletons";
import { FileText } from "lucide-react";

export default function Loading() {
	return (
		<AppShell>
			<DocumentsPageSkeleton
				header={
					<PageHero
						icon={FileText}
						title="My Documents"
						description="Upload, manage, and organise your property documents"
					/>
				}
			/>
		</AppShell>
	);
}
