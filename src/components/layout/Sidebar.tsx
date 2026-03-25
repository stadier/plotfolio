"use client";

import {
	BarChart3,
	FileText,
	Grid,
	HelpCircle,
	Home,
	MapPin,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
	{ name: "Dashboard", href: "/", icon: Home },
	{ name: "Properties", href: "/properties", icon: Grid },
	{ name: "Map View", href: "/map", icon: MapPin },
	{ name: "Analytics", href: "/analytics", icon: BarChart3 },
	{ name: "Documents", href: "/documents", icon: FileText },
];

interface SidebarProps {
	className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
	const pathname = usePathname();

	return (
		<aside
			className={`hidden md:flex flex-col h-full w-64 shrink-0 border-r border-slate-200 bg-slate-50 pt-8 pb-8 px-4 ${className}`}
		>
			{/* Section header */}
			<div className="mb-8 px-4">
				<h2 className="font-headline text-xs font-bold uppercase tracking-widest text-secondary mb-1">
					Navigation
				</h2>
				<p className="text-[10px] text-slate-500 uppercase tracking-tighter">
					Manage your portfolio
				</p>
			</div>

			{/* Main navigation */}
			<nav className="flex-1 flex flex-col gap-1">
				{mainNav.map((item) => {
					const Icon = item.icon;
					const isActive =
						item.href === "/"
							? pathname === "/"
							: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
								isActive
									? "bg-white text-primary font-bold shadow-sm"
									: "text-slate-600 hover:translate-x-1 hover:bg-slate-100"
							}`}
						>
							<Icon
								className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-slate-500"}`}
							/>
							<span className="font-label text-xs uppercase tracking-widest">
								{item.name}
							</span>
						</Link>
					);
				})}
			</nav>

			{/* Bottom section */}
			<div className="mt-auto pt-6 flex flex-col gap-4">
				{/* Primary CTA */}
				<Link
					href="/properties"
					className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-transform text-center block"
				>
					Add Property
				</Link>

				{/* Secondary links */}
				<div className="flex flex-col gap-1 border-t border-slate-200 pt-4">
					<Link
						href="/settings"
						className="text-slate-500 flex items-center gap-3 px-4 py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
					>
						<Settings className="w-4 h-4" />
						Settings
					</Link>
					<Link
						href="/help"
						className="text-slate-500 flex items-center gap-3 px-4 py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
					>
						<HelpCircle className="w-4 h-4" />
						Help Center
					</Link>
				</div>
			</div>
		</aside>
	);
}
