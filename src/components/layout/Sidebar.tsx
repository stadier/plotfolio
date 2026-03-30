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
	Search,
	Settings,
	ShoppingBag,
	Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

interface SidebarProps {
	className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const navItems = isMarketplace ? marketplaceNav : portfolioNav;

	return (
		<aside
			className={`hidden md:flex flex-col h-full w-64 shrink-0 border-r border-slate-200 dark:border-outline-variant bg-slate-50 dark:bg-surface-container-low pt-8 pb-8 px-4 ${className}`}
		>
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
							className={`px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
								isActive
									? "bg-white dark:bg-surface-container-high text-primary font-bold shadow-sm dark:shadow-none"
									: "text-slate-600 dark:text-on-surface-variant hover:translate-x-1 hover:bg-slate-100 dark:hover:bg-surface-container"
							}`}
						>
							<Icon
								className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-slate-500 dark:text-on-surface-variant"}`}
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
				{isMarketplace ? (
					<Link
						href="/marketplace"
						className="bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-all text-center flex items-center justify-center gap-2 btn-press"
					>
						<Search className="w-4 h-4" />
						Find Property
					</Link>
				) : (
					<Link
						href="/portfolio/properties/new"
						className="signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-all text-center block btn-press"
					>
						Add Property
					</Link>
				)}

				{/* Secondary links */}
				<div className="flex flex-col gap-1 border-t border-slate-200 dark:border-outline-variant pt-4">
					<Link
						href="/settings"
						className="text-slate-500 dark:text-on-surface-variant flex items-center gap-3 px-4 py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-surface-container"
					>
						<Settings className="w-4 h-4" />
						Settings
					</Link>
					<Link
						href="/help"
						className="text-slate-500 dark:text-on-surface-variant flex items-center gap-3 px-4 py-2 text-xs hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-surface-container"
					>
						<HelpCircle className="w-4 h-4" />
						Help Center
					</Link>
				</div>
			</div>
		</aside>
	);
}
