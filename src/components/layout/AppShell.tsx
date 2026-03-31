"use client";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppShellProps {
	children: React.ReactNode;
	/**
	 * When false, the main content area uses overflow-hidden (e.g. for the full-screen map).
	 * Default: true (overflow-y-auto).
	 */
	scrollable?: boolean;
}

/**
 * AppShell wraps all standard pages with the fixed Header and Sidebar.
 * Pages using AppShell should NOT render their own Header or Sidebar.
 */
export default function AppShell({
	children,
	scrollable = true,
}: AppShellProps) {
	return (
		<>
			<Header />
			{/* pt-[65px] accounts for the fixed header height */}
			<div className="flex h-screen pt-[65px] overflow-hidden">
				<Sidebar />
				<main
					className={`flex-1 bg-background ${
						scrollable ? "overflow-y-auto" : "overflow-hidden"
					}`}
				>
					{children}
				</main>
			</div>
		</>
	);
}
