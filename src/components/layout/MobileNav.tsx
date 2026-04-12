"use client";

import { useAuth } from "@/components/AuthContext";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import {
	BarChart3,
	Bell,
	Bookmark,
	Briefcase,
	FileText,
	Grid,
	Heart,
	LayoutDashboard,
	MapPin,
	Menu,
	Monitor,
	Moon,
	Settings,
	ShoppingBag,
	Sun,
	Tag,
	Users,
	X,
	type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
	name: string;
	href: string;
	icon: LucideIcon;
}

const portfolioNav: NavItem[] = [
	{ name: "Dashboard", href: "/portfolio", icon: LayoutDashboard },
	{ name: "Properties", href: "/portfolio/properties", icon: Grid },
	{ name: "Map", href: "/portfolio/map", icon: MapPin },
	{ name: "Analytics", href: "/portfolio/analytics", icon: BarChart3 },
];

const portfolioMore: NavItem[] = [
	{ name: "Documents", href: "/portfolio/documents", icon: FileText },
	{ name: "Team", href: "/portfolio/team", icon: Users },
	{ name: "Settings", href: "/settings", icon: Settings },
];

const marketplaceNav: NavItem[] = [
	{ name: "Browse", href: "/marketplace", icon: ShoppingBag },
	{ name: "Favourites", href: "/marketplace/favourites", icon: Heart },
	{ name: "Map", href: "/marketplace/map", icon: MapPin },
	{ name: "Saved", href: "/marketplace/saved", icon: Bookmark },
];

const marketplaceMore: NavItem[] = [
	{ name: "Categories", href: "/marketplace/categories", icon: Tag },
	{ name: "Alerts", href: "/marketplace/alerts", icon: Bell },
	{ name: "Settings", href: "/settings", icon: Settings },
];

const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export default function MobileNav() {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const { user } = useAuth();
	const { theme, setTheme } = useTheme();
	const [moreOpen, setMoreOpen] = useState(false);

	// Close the "more" drawer on route change
	useEffect(() => {
		setMoreOpen(false);
	}, [pathname]);

	// Prevent body scroll when drawer is open
	useEffect(() => {
		if (moreOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [moreOpen]);

	const bottomItems = isMarketplace ? marketplaceNav : portfolioNav;
	const drawerItems = isMarketplace ? marketplaceMore : portfolioMore;

	function isActive(href: string) {
		if (isMarketplace) {
			return href === "/marketplace"
				? pathname === "/marketplace"
				: pathname.startsWith(href);
		}
		return href === "/portfolio"
			? pathname === "/portfolio"
			: pathname.startsWith(href);
	}

	return (
		<>
			{/* Bottom navigation bar — visible only below md */}
			<nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border md:hidden safe-bottom">
				<div className="flex items-center justify-around px-1 pt-1.5 pb-1">
					{bottomItems.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 transition-colors ${
									active ? "text-primary" : "text-on-surface-variant"
								}`}
							>
								<Icon className="w-5 h-5" />
								<span className="text-[10px] font-semibold truncate">
									{item.name}
								</span>
							</Link>
						);
					})}
					{/* More button */}
					<button
						onClick={() => setMoreOpen(true)}
						className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 transition-colors ${
							moreOpen ? "text-primary" : "text-on-surface-variant"
						}`}
					>
						<Menu className="w-5 h-5" />
						<span className="text-[10px] font-semibold">More</span>
					</button>
				</div>
			</nav>

			{/* "More" slide-up drawer */}
			{moreOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-50 bg-black/40 md:hidden"
						onClick={() => setMoreOpen(false)}
					/>
					{/* Drawer */}
					<div className="fixed bottom-0 inset-x-0 z-50 bg-card rounded-t-2xl border-t border-border md:hidden animate-slide-up safe-bottom">
						<div className="flex items-center justify-between px-5 pt-4 pb-2">
							<div className="flex items-center gap-2">
								<Image
									src="/plotfolio-logo.svg"
									alt="Plotfolio"
									width={24}
									height={24}
									className="w-6 h-6"
								/>
								<span className="font-headline font-bold text-primary text-base tracking-tight">
									Plotfolio
								</span>
							</div>
							<button
								onClick={() => setMoreOpen(false)}
								className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
							>
								<X className="w-5 h-5 text-on-surface-variant" />
							</button>
						</div>

						{/* Section switcher */}
						{user && (
							<div className="flex gap-2 px-5 py-2">
								<Link
									href="/portfolio"
									className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
										!isMarketplace
											? "bg-blue-600 text-white"
											: "bg-surface-container text-on-surface-variant"
									}`}
								>
									<Briefcase className="w-3.5 h-3.5" />
									Portfolio
								</Link>
								<Link
									href="/marketplace"
									className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
										isMarketplace
											? "bg-blue-600 text-white"
											: "bg-surface-container text-on-surface-variant"
									}`}
								>
									<ShoppingBag className="w-3.5 h-3.5" />
									Marketplace
								</Link>
							</div>
						)}

						{/* Additional nav items */}
						<div className="px-3 py-2 space-y-0.5">
							{drawerItems.map((item) => {
								const Icon = item.icon;
								const active = isActive(item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
											active
												? "bg-nav-active text-primary font-semibold"
												: "text-on-surface-variant hover:bg-surface-container"
										}`}
									>
										<Icon className="w-[18px] h-[18px]" />
										<span className="text-[13px]">{item.name}</span>
									</Link>
								);
							})}
						</div>

						{/* Theme switcher */}
						<div className="px-5 py-3 border-t border-border">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-2">
								Theme
							</p>
							<div className="flex gap-2">
								{themeOptions.map((opt) => {
									const Icon = opt.icon;
									const active = theme === opt.value;
									return (
										<button
											key={opt.value}
											onClick={() => setTheme(opt.value)}
											className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
												active
													? "bg-surface-container text-on-surface"
													: "text-on-surface-variant hover:bg-surface-container"
											}`}
										>
											<Icon className="w-4 h-4" />
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Extra bottom padding for safe area */}
						<div className="h-4" />
					</div>
				</>
			)}
		</>
	);
}
