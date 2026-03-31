"use client";

import {
	BarChart3,
	Bell,
	Bookmark,
	FileText,
	Grid,
	Heart,
	HelpCircle,
	Home,
	type LucideIcon,
	MapPin,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Settings,
	ShoppingBag,
	Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface NavItem {
	name: string;
	href: string;
	icon: LucideIcon;
}

const portfolioNav: NavItem[] = [
	{ name: "Dashboard", href: "/portfolio", icon: Home },
	{ name: "Properties", href: "/portfolio/properties", icon: Grid },
	{ name: "Map View", href: "/portfolio/map", icon: MapPin },
	{ name: "Analytics", href: "/portfolio/analytics", icon: BarChart3 },
	{ name: "Documents", href: "/portfolio/documents", icon: FileText },
];

const marketplaceNav: NavItem[] = [
	{ name: "Browse", href: "/marketplace", icon: ShoppingBag },
	{ name: "Favourites", href: "/marketplace/favourites", icon: Heart },
	{ name: "Categories", href: "/marketplace/categories", icon: Tag },
	{ name: "Map Search", href: "/marketplace/map", icon: MapPin },
	{ name: "Saved Searches", href: "/marketplace/saved", icon: Bookmark },
	{ name: "Alerts", href: "/marketplace/alerts", icon: Bell },
	{ name: "Inquiries", href: "/marketplace/inquiries", icon: MessageSquare },
];

const STORAGE_KEY = "plotfolio-sidebar-collapsed";

interface SidebarProps {
	className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const navItems = isMarketplace ? marketplaceNav : portfolioNav;

	// Start expanded for SSR consistency. CSS rules in globals.css handle the
	// visual collapsed state via html[data-sidebar-collapsed] before React hydrates.
	const [collapsed, setCollapsed] = useState(false);
	const [mounted, setMounted] = useState(false);

	// Sync React state from the data attribute after mount (no visual change
	// because the CSS rules already match).
	useEffect(() => {
		const isCollapsed =
			document.documentElement.getAttribute("data-sidebar-collapsed") ===
			"true";
		setCollapsed(isCollapsed);
		// Enable transitions only after the first state sync
		requestAnimationFrame(() => setMounted(true));
	}, []);

	const toggle = useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(STORAGE_KEY, String(next));
			if (next) {
				document.documentElement.setAttribute("data-sidebar-collapsed", "true");
			} else {
				document.documentElement.removeAttribute("data-sidebar-collapsed");
			}
			return next;
		});
	}, []);

	return (
		<aside
			data-sidebar
			className={`relative hidden md:flex flex-col h-full shrink-0 border-r border-slate-200 dark:border-outline-variant bg-slate-50 dark:bg-surface-container-low pt-8 pb-8 ${mounted ? "transition-all duration-300 ease-in-out" : ""} ${
				collapsed ? "w-[72px] px-2" : "w-64 px-4"
			} ${className}`}
		>
			{/* Collapse toggle — pinned to the right edge, vertically centered */}
			<button
				onClick={toggle}
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-10 flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 dark:border-outline-variant bg-white dark:bg-surface-container-high text-slate-400 dark:text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-sm transition-all"
			>
				{collapsed ? (
					<PanelLeftOpen className="w-3.5 h-3.5" />
				) : (
					<PanelLeftClose className="w-3.5 h-3.5" />
				)}
			</button>

			{/* Main navigation */}
			<nav className="flex-1 flex flex-col gap-1">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = isMarketplace
						? item.href === "/marketplace"
							? pathname === "/marketplace"
							: pathname.startsWith(item.href)
						: item.href === "/portfolio"
							? pathname === "/portfolio"
							: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							data-sidebar-link
							title={collapsed ? item.name : undefined}
							className={`py-3 flex items-center rounded-lg transition-all ${
								collapsed ? "justify-center" : "gap-3 px-4"
							} ${
								isActive
									? "bg-white dark:bg-surface-container-high text-primary font-bold shadow-sm dark:shadow-none"
									: "text-slate-600 dark:text-on-surface-variant hover:translate-x-1 hover:bg-slate-100 dark:hover:bg-surface-container"
							}`}
						>
							<Icon
								className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-slate-500 dark:text-on-surface-variant"}`}
							/>
							<span
								data-sidebar-label
								className={`font-label text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${
									collapsed
										? "w-0 opacity-0 overflow-hidden"
										: "w-auto opacity-100"
								}`}
							>
								{item.name}
							</span>
						</Link>
					);
				})}
			</nav>

			{/* Bottom section */}
			<div className="mt-auto pt-6 flex flex-col gap-4">
				{/* Primary CTA */}
				{isMarketplace ? (
					<Link
						href="/marketplace"
						title={collapsed ? "Find Property" : undefined}
						className={`bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 btn-press ${
							collapsed ? "px-0" : ""
						}`}
					>
						<Search className="w-4 h-4 shrink-0" />
						<span
							data-sidebar-label
							className={`whitespace-nowrap transition-all duration-300 ${
								collapsed
									? "w-0 opacity-0 overflow-hidden"
									: "w-auto opacity-100"
							}`}
						>
							Find Property
						</span>
					</Link>
				) : (
					<Link
						href="/portfolio/properties/new"
						title={collapsed ? "Add Property" : undefined}
						className={`signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 btn-press ${
							collapsed ? "px-0" : ""
						}`}
					>
						{collapsed ? <Plus className="w-5 h-5" /> : "Add Property"}
					</Link>
				)}

				{/* Secondary links */}
				<div className="flex flex-col gap-1 border-t border-slate-200 dark:border-outline-variant pt-4">
					<Link
						href="/settings"
						data-sidebar-link
						title={collapsed ? "Settings" : undefined}
						className={`text-slate-500 dark:text-on-surface-variant flex items-center py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-surface-container ${
							collapsed ? "justify-center" : "gap-3 px-4"
						}`}
					>
						<Settings className="w-4 h-4 shrink-0" />
						<span
							data-sidebar-label
							className={`whitespace-nowrap transition-all duration-300 ${
								collapsed
									? "w-0 opacity-0 overflow-hidden"
									: "w-auto opacity-100"
							}`}
						>
							Settings
						</span>
					</Link>
					<Link
						href="/help"
						data-sidebar-link
						title={collapsed ? "Help Center" : undefined}
						className={`text-slate-500 dark:text-on-surface-variant flex items-center py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-surface-container ${
							collapsed ? "justify-center" : "gap-3 px-4"
						}`}
					>
						<HelpCircle className="w-4 h-4 shrink-0" />
						<span
							data-sidebar-label
							className={`whitespace-nowrap transition-all duration-300 ${
								collapsed
									? "w-0 opacity-0 overflow-hidden"
									: "w-auto opacity-100"
							}`}
						>
							Help Center
						</span>
					</Link>
				</div>
			</div>
		</aside>
	);
}
