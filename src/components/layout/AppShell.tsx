"use client";

import Header from "./Header";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";

interface AppShellProps {
	children: React.ReactNode;
	/**
	 * When false, the main content area uses overflow-hidden (e.g. for the full-screen map).
	 * Default: true (overflow-y-auto).
	 */
	scrollable?: boolean;
	/** Hide the "Add Property" CTA in the sidebar. */
	hideAddProperty?: boolean;
}

/**
 * AppShell wraps all standard pages with the fixed Header and Sidebar.
 * Pages using AppShell should NOT render their own Header or Sidebar.
 */
export default function AppShell({
	children,
	scrollable = true,
	hideAddProperty,
}: AppShellProps) {
	return (
		<div className="flex h-screen overflow-hidden bg-sidebar">
			<Sidebar hideAddProperty={hideAddProperty} />
			<div className="flex-1 flex flex-col min-w-0">
				<Header />
				<main
					className={`flex-1 flex flex-col bg-background min-h-0 isolate pb-16 md:pb-0 ${
						scrollable ? "overflow-y-auto" : "overflow-hidden"
					}`}
				>
					{children}
				</main>
			</div>
			<MobileNav />
		</div>
	);
}
