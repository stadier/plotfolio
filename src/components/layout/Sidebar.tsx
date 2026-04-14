"use client";

import { usePortfolio } from "@/components/PortfolioContext";
import { useTheme, type Theme } from "@/components/ThemeProvider";
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
	LayoutDashboard,
	MapPin,
	MessageSquare,
	Monitor,
	Moon,
	MoreHorizontal,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Send,
	Settings,
	ShoppingBag,
	Sun,
	Tag,
	Users,
	type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NavItem {
	name: string;
	href: string;
	icon: LucideIcon;
}

const portfolioNav: NavItem[] = [
	{ name: "Dashboard", href: "/portfolio", icon: LayoutDashboard },
	{ name: "Properties", href: "/portfolio/properties", icon: Grid },
	{ name: "Map View", href: "/portfolio/map", icon: MapPin },
	{ name: "Transfers", href: "/portfolio/transfers", icon: Send },
	{ name: "Bookings", href: "/portfolio/bookings", icon: MessageSquare },
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

const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

function ThemePicker() {
	const { theme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	const ActiveIcon = themeOptions.find((o) => o.value === theme)?.icon ?? Moon;

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((p) => !p)}
				title="Theme"
				className={`p-2 rounded-lg transition-all ${
					open
						? "text-on-surface bg-surface-container"
						: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
				}`}
			>
				<ActiveIcon className="w-[18px] h-[18px]" />
			</button>
			{open && (
				<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[140px]">
					{themeOptions.map((opt) => {
						const Icon = opt.icon;
						const isActive = theme === opt.value;
						return (
							<button
								key={opt.value}
								onClick={() => {
									setTheme(opt.value);
									setOpen(false);
								}}
								className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors ${
									isActive
										? "bg-surface-container text-on-surface font-semibold"
										: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
								}`}
							>
								<Icon className="w-4 h-4" />
								{opt.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
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
		activePermissions,
	} = usePortfolio();
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [switcherSearch, setSwitcherSearch] = useState("");
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
			className={`relative hidden md:flex flex-col h-full shrink-0 bg-sidebar px-2 pb-4 ${mounted ? "transition-all duration-300 ease-in-out" : ""} ${
				collapsed ? "w-[72px]" : "w-56"
			} ${className}`}
		>
			{/* Logo */}
			<div className="flex items-center px-4 gap-2 pt-4.5 pb-3">
				<Link href="/" className="flex items-center gap-2">
					<Image
						src="/plotfolio-logo.svg"
						alt="Plotfolio"
						width={28}
						height={28}
						className="w-7 h-7 shrink-0"
					/>
					<span
						data-sidebar-label
						className={`text-xl font-bold tracking-tighter text-primary font-headline whitespace-nowrap transition-all duration-300 ${
							collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
						}`}
					>
						Plotfolio
					</span>
				</Link>
			</div>

			{/* Portfolio switcher — under logo */}
			{!isMarketplace && portfolios.length > 0 && (
				<div ref={switcherRef} className="relative my-3">
					<button
						onClick={() => {
							setSwitcherOpen((prev) => !prev);
							setSwitcherSearch("");
						}}
						title={
							collapsed
								? (activePortfolio?.name ?? "Switch portfolio")
								: undefined
						}
						className={`ml-1 flex items-center gap-2 px-3 py-2 rounded-md w-[calc(100%-7px)] overflow-hidden hover:bg-surface-container transition-colors ${
							!collapsed ? "border border-border" : ""
						}`}
					>
						{activePortfolio?.avatar ? (
							<img
								src={activePortfolio.avatar}
								alt=""
								className="w-6 h-6 rounded-md object-cover shrink-0"
							/>
						) : (
							<span className="w-6 h-6 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
								{(activePortfolio?.name ?? "P").charAt(0).toUpperCase()}
							</span>
						)}
						<span
							data-sidebar-label
							className={`text-left truncate text-[13px] font-semibold text-on-surface whitespace-nowrap transition-all duration-300 ${
								collapsed
									? "w-0 opacity-0 overflow-hidden"
									: "flex-1 opacity-100"
							}`}
						>
							{activePortfolio?.name ?? "Portfolio"}
						</span>
						{!collapsed && (
							<ChevronDown
								className={`w-3.5 h-3.5 text-on-surface-variant shrink-0 transition-transform ${
									switcherOpen ? "rotate-180" : ""
								}`}
							/>
						)}
					</button>

					{switcherOpen && (
						<div className="absolute z-50 left-full ml-3 top-0 w-56 bg-card border border-border rounded-md shadow-2xl overflow-hidden">
							{/* Search */}
							<div className="flex items-center gap-2 px-3 py-2 border-b border-border">
								<Search className="w-3.5 h-3.5 text-outline shrink-0" />
								<input
									type="text"
									placeholder="Search portfolios"
									value={switcherSearch}
									onChange={(e) => setSwitcherSearch(e.target.value)}
									className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-outline outline-none"
									autoFocus
								/>
							</div>

							{/* Portfolio list */}
							<div className="px-1.5 py-1.5 space-y-0.5">
								{portfolios
									.filter((p) =>
										p.name.toLowerCase().includes(switcherSearch.toLowerCase()),
									)
									.map((p) => {
										const isActive = p.id === activePortfolio?.id;
										return (
											<div key={p.id}>
												{deletingId === p.id ? (
													<div className="px-2.5 py-2 space-y-2 rounded-lg bg-surface-container">
														<p className="text-xs text-on-surface">
															Delete <strong>{p.name}</strong>? This cannot be
															undone.
														</p>
														<div className="flex gap-2">
															<button
																onClick={() => handleDeletePortfolio(p.id)}
																className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
															>
																Delete
															</button>
															<button
																onClick={() => setDeletingId(null)}
																className="px-2 py-0.5 text-xs font-semibold bg-surface-container-high text-on-surface rounded-md hover:bg-surface-container transition-colors"
															>
																Cancel
															</button>
														</div>
													</div>
												) : (
													<button
														onClick={() => {
															setActivePortfolioId(p.id);
															setSwitcherOpen(false);
														}}
														className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
															isActive
																? "bg-surface-container-high"
																: "hover:bg-surface-container"
														}`}
													>
														{p.avatar ? (
															<img
																src={p.avatar}
																alt=""
																className="w-6 h-6 rounded-md object-cover shrink-0"
															/>
														) : (
															<span className="w-6 h-6 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
																{p.name.charAt(0).toUpperCase()}
															</span>
														)}
														<span className="flex-1 text-[13px] font-medium text-on-surface truncate">
															{p.name}
														</span>
													</button>
												)}
											</div>
										);
									})}
							</div>

							{/* All portfolios */}
							<Link
								href="/portfolio/all"
								onClick={() => setSwitcherOpen(false)}
								className="flex items-center justify-between p-2.5 px-3 m-1.5 hover:bg-surface-container transition-colors rounded-md"
							>
								<span className="text-[13px] font-medium text-on-surface">
									All portfolios
								</span>
							</Link>

							{/* New portfolio */}
							<div className="px-1.5 pb-2.5 pt-1.5">
								<Link
									href="/portfolio/new"
									onClick={() => setSwitcherOpen(false)}
									className="flex items-center justify-center gap-1.5 w-full rounded-md signature-gradient text-white hover:opacity-90 transition-opacity px-3 py-2"
								>
									<Plus className="w-3.5 h-3.5" />
									<span className="text-[13px] font-semibold">
										New portfolio
									</span>
								</Link>
							</div>
						</div>
					)}
				</div>
			)}
			{/* Collapse toggle — pinned to the right edge, vertically centered */}
			<button
				onClick={toggle}
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 flex items-center justify-center w-6 h-6 rounded-full border border-border bg-card text-slate-400 dark:text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-sm transition-all"
			>
				{collapsed ? (
					<PanelLeftOpen className="w-3 h-3" />
				) : (
					<PanelLeftClose className="w-3 h-3" />
				)}
			</button>

			{/* Main navigation */}
			<nav className="flex-1 flex flex-col gap-0.5 px-[7px]">
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
							className={`flex items-center gap-3 px-3 py-2 rounded-md overflow-hidden transition-all ${
								isActive
									? "bg-nav-active text-primary font-semibold shadow-sm dark:shadow-none"
									: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
							}`}
						>
							<span className="relative shrink-0">
								<Icon
									className={`w-[18px] h-[18px] ${isActive ? "text-primary" : ""}`}
								/>
								{badgeCount > 0 && collapsed && (
									<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
										{badgeCount}
									</span>
								)}
							</span>
							<span
								data-sidebar-label
								className={`text-[13px] whitespace-nowrap transition-all duration-300 ${
									collapsed
										? "w-0 opacity-0 overflow-hidden"
										: "w-auto opacity-100"
								}`}
							>
								{item.name}
							</span>
							{badgeCount > 0 && !collapsed && (
								<span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
									{badgeCount}
								</span>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Bottom section */}
			<div className="mt-auto pt-4 flex flex-col gap-3">
				{/* Primary CTA */}
				{isMarketplace ? (
					<Link
						href="/marketplace"
						title={collapsed ? "Find Property" : undefined}
						className={`bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center btn-press overflow-hidden ${collapsed ? "" : "gap-2"}`}
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
					!hideAddProperty &&
					activePermissions.canCreateProperties && (
						<Link
							href="/portfolio/properties/new"
							title={collapsed ? "Add Property" : undefined}
							className={`bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center btn-press overflow-hidden ${collapsed ? "" : "gap-2"}`}
						>
							<Plus className="w-4 h-4 shrink-0" />
							<span
								data-sidebar-label
								className={`whitespace-nowrap transition-all duration-300 ${
									collapsed
										? "w-0 opacity-0 overflow-hidden"
										: "w-auto opacity-100"
								}`}
							>
								Add Property
							</span>
						</Link>
					)
				)}

				<div className="flex flex-wrap items-center justify-center gap-1 border-t border-border pt-3 transition-all duration-300">
					<Link
						href="/help"
						title="Help Center"
						className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
					>
						<HelpCircle className="w-[18px] h-[18px]" />
					</Link>
					<Link
						href="/settings"
						title="Settings"
						className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
					>
						<Settings className="w-[18px] h-[18px]" />
					</Link>
					<ThemePicker />
					<button
						title="More"
						className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
					>
						<MoreHorizontal className="w-[18px] h-[18px]" />
					</button>
				</div>
			</div>
		</aside>
	);
}
