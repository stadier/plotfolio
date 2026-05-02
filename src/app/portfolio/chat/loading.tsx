import AppShell from "@/components/layout/AppShell";
import { ChatListSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
	return (
		<AppShell scrollable={false}>
			<div className="flex h-full">
				<aside className="w-[320px] shrink-0 border-r border-border p-4">
					<ChatListSkeleton count={6} />
				</aside>
				<div className="flex-1" />
			</div>
		</AppShell>
	);
}
