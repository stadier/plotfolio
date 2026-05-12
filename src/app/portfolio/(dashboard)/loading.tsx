import AppShell from "@/components/layout/AppShell";

// Render an empty shell during the route transition. The page itself handles
// a delayed skeleton, so brand-new accounts with no data resolve instantly
// without a skeleton flash.
export default function Loading() {
	return <AppShell>{null}</AppShell>;
}
