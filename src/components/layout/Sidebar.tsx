"use client";

import { usePortfolio } from "@/components/PortfolioContext";
import { PortfolioAPI } from "@/lib/api";
import {
	BarChart3,
	Bell,
	Bookmark,
	ChevronDown,
	FileText,
	Grid,
	Heart,
	HelpCircle,
	Home,
	MapPin,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Settings,
	ShoppingBag,
	Tag,
	Trash2,
	Users,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
	{ name: "Team", href: "/portfolio/team", icon: Users },
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
	hideAddProperty?: boolean;
}

export default function Sidebar({
	className = "",
	hideAddProperty,
}: SidebarProps) {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const navItems = isMarketplace ? marketplaceNav : portfolioNav;
	const {
		portfolios,
		activePortfolio,
		setActivePortfolioId,
		pendingInvites,
		refresh,
	} = usePortfolio();
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const switcherRef = useRef<HTMLDivElement>(null);

	const handleDeletePortfolio = async (id: string) => {
		try {
			await PortfolioAPI.remove(id);
			setDeletingId(null);
			setSwitcherOpen(false);
			await refresh();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete portfolio");
		}
	};

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

	// Close switcher on click outside
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				switcherRef.current &&
				!switcherRef.current.contains(e.target as Node)
			) {
				setSwitcherOpen(false);
			}
		}
		if (switcherOpen) {
			document.addEventListener("mousedown", handleClick);
			return () => document.removeEventListener("mousedown", handleClick);
		}
	}, [switcherOpen]);

	return (
		<aside
			data-sidebar
			className={`relative hidden md:flex flex-col h-full shrink-0 border-r border-border bg-sidebar pt-8 pb-8 ${mounted ? "transition-all duration-300 ease-in-out" : ""} ${
				collapsed ? "w-[72px] px-2" : "w-64 px-4"
			} ${className}`}
		>
			{/* Collapse toggle — pinned to the right edge, vertically centered */}
			<button
				onClick={toggle}
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-10 flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-slate-400 dark:text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-sm transition-all"
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
					const badgeCount =
						item.href === "/portfolio/team" ? pendingInvites.length : 0;
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
									? "bg-nav-active text-primary font-bold shadow-sm dark:shadow-none"
									: "text-slate-600 dark:text-on-surface-variant hover:translate-x-1 hover:bg-slate-100 dark:hover:bg-surface-container"
							}`}
						>
							<span className="relative shrink-0">
								<Icon
									className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-500 dark:text-on-surface-variant"}`}
								/>
								{badgeCount > 0 && collapsed && (
									<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
										{badgeCount}
									</span>
								)}
							</span>
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
							{badgeCount > 0 && !collapsed && (
								<span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
									{badgeCount}
								</span>
							)}
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
					!hideAddProperty && (
						<Link
							href="/portfolio/properties/new"
							title={collapsed ? "Add Property" : undefined}
							className={`signature-gradient text-white font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 btn-press ${
								collapsed ? "px-0" : ""
							}`}
						>
							{collapsed ? <Plus className="w-5 h-5" /> : "Add Property"}
						</Link>
					)
				)}

				{/* Secondary links */}
				{/* Portfolio switcher — only show on portfolio pages when user has portfolios */}
				{!isMarketplace && portfolios.length > 0 && (
					<div
						ref={switcherRef}
						className="relative border-t border-border pt-4 pb-2"
					>
						<button
							onClick={() => setSwitcherOpen((prev) => !prev)}
							title={
								collapsed
									? (activePortfolio?.name ?? "Switch portfolio")
									: undefined
							}
							className={`w-full flex items-center rounded-lg bg-surface-container-high hover:bg-surface-container transition-colors ${
								collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
							}`}
						>
							{activePortfolio?.avatar ? (
								<img
									src={activePortfolio.avatar}
									alt=""
									className="w-7 h-7 rounded-md object-cover shrink-0"
								/>
							) : (
								<span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
									{(activePortfolio?.name ?? "P").charAt(0).toUpperCase()}
								</span>
							)}
							<span
								data-sidebar-label
								className={`flex-1 text-left truncate text-sm font-semibold text-on-surface transition-all duration-300 ${
									collapsed
										? "w-0 opacity-0 overflow-hidden"
										: "w-auto opacity-100"
								}`}
							>
								{activePortfolio?.name ?? "Portfolio"}
							</span>
							{!collapsed && (
								<ChevronDown
									className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${
										switcherOpen ? "rotate-180" : ""
									}`}
								/>
							)}
						</button>

						{switcherOpen && (
							<div
								className={`absolute z-50 bottom-full mb-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden ${
									collapsed
										? "left-full ml-2 bottom-0 mb-0 w-72"
										: "left-0 w-72"
								}`}
							>
								{/* Items container */}
								<div className="bg-surface-container rounded-xl m-2 divide-y divide-border">
									{portfolios.map((p) => {
										const isActive = p.id === activePortfolio?.id;
										const canDelete =
											p.type === "business" && p.role === "admin";
										return (
											<div
												key={p.id}
												className="first:rounded-t-xl last:rounded-b-xl"
											>
												{deletingId === p.id ? (
													<div className="px-4 py-3.5 space-y-2">
														<p className="text-sm text-on-surface">
															Delete <strong>{p.name}</strong>? This cannot be
															undone.
														</p>
														<div className="flex gap-2">
															<button
																onClick={() => handleDeletePortfolio(p.id)}
																className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
															>
																Delete
															</button>
															<button
																onClick={() => setDeletingId(null)}
																className="px-3 py-1.5 text-xs font-semibold bg-surface-container-high text-on-surface rounded-md hover:bg-surface-container transition-colors"
															>
																Cancel
															</button>
														</div>
													</div>
												) : (
													<div className="flex items-center hover:bg-surface-container-high transition-colors first:rounded-t-xl last:rounded-b-xl">
														<button
															onClick={() => {
																setActivePortfolioId(p.id);
																setSwitcherOpen(false);
															}}
															className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left min-w-0"
														>
															{p.avatar ? (
																<img
																	src={p.avatar}
																	alt=""
																	className="w-10 h-10 rounded-full object-cover shrink-0"
																/>
															) : (
																<span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
																	{p.name.charAt(0).toUpperCase()}
																</span>
															)}
															<div className="flex-1 min-w-0">
																<p className="text-sm font-semibold text-on-surface truncate">
																	{p.name}
																</p>
																<p className="text-xs text-on-surface-variant">
																	{p.memberCount ?? 1}{" "}
																	{(p.memberCount ?? 1) === 1
																		? "Member"
																		: "Members"}
																</p>
															</div>
															{isActive ? (
																<span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
																	Active
																</span>
															) : (
																<span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-white">
																	Switch
																</span>
															)}
														</button>
														{canDelete && (
															<button
																onClick={() => setDeletingId(p.id)}
																title="Delete portfolio"
																className="px-3 py-2 text-on-surface-variant hover:text-red-500 transition-colors shrink-0"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														)}
													</div>
												)}
											</div>
										);
									})}
								</div>

								{/* Create new portfolio */}
								<div className="px-4 py-3">
									<Link
										href="/portfolio/new"
										onClick={() => setSwitcherOpen(false)}
										className="flex items-center gap-3 text-left"
									>
										<span className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0">
											<Plus className="w-4 h-4 text-on-surface-variant" />
										</span>
										<span className="text-sm font-semibold text-on-surface">
											Create New Portfolio
										</span>
									</Link>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="flex flex-col gap-1 border-t border-border pt-4">
					{(
						[
							{ name: "Settings", href: "/settings", icon: Settings },
							{ name: "Help Center", href: "/help", icon: HelpCircle },
						] as NavItem[]
					).map((item) => {
						const Icon = item.icon;
						const isActive = pathname.startsWith(item.href);
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
										? "bg-nav-active text-primary font-bold shadow-sm dark:shadow-none"
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
				</div>
			</div>
		</aside>
	);
}
