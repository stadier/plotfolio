"use client";

import { useAuth } from "@/components/AuthContext";
import UserAvatar from "@/components/ui/UserAvatar";
import { Bell, Briefcase, LogOut, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Sliding pill that animates position & colour between Portfolio / Marketplace */
function SwitcherPill({
	isMarketplace,
	hasUser,
}: {
	isMarketplace: boolean;
	hasUser: boolean;
}) {
	const pillRef = useRef<HTMLDivElement>(null);
	const [style, setStyle] = useState<React.CSSProperties>({});

	useEffect(() => {
		const pill = pillRef.current;
		if (!pill) return;
		const container = pill.parentElement;
		if (!container) return;

		const selector = isMarketplace || !hasUser ? "marketplace" : "portfolio";
		const target = container.querySelector(
			`[data-switcher="${selector}"]`,
		) as HTMLElement | null;
		if (!target) return;

		const containerRect = container.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		setStyle({
			left: targetRect.left - containerRect.left,
			width: targetRect.width,
			height: targetRect.height,
		});
	}, [isMarketplace, hasUser]);

	const bg = "rgb(37 99 235)"; /* blue-600 for both states */

	return (
		<div
			ref={pillRef}
			className="absolute top-1 rounded-full shadow-sm transition-all duration-300 ease-in-out"
			style={{ ...style, backgroundColor: bg }}
		/>
	);
}

export default function Header() {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const { user, logout } = useAuth();

	return (
		<header className="fixed top-0 w-full z-[1100] bg-card border-b border-border">
			<div className="relative flex items-center justify-between px-8 py-4 w-full">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2.5">
					<Image
						src="/plotfolio-logo.svg"
						alt="Plotfolio"
						width={32}
						height={32}
						className="w-8 h-8"
					/>
					<span className="text-2xl font-bold tracking-tighter text-primary font-headline">
						Plotfolio
					</span>
				</Link>

				{/* Portfolio / Marketplace switcher — absolutely centered */}
				<div className="hidden md:flex items-center bg-slate-100 dark:bg-surface-container rounded-full p-1 absolute left-1/2 -translate-x-1/2">
					<SwitcherPill isMarketplace={isMarketplace} hasUser={!!user} />
					{user && (
						<Link
							href="/portfolio"
							data-switcher="portfolio"
							className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${
								!isMarketplace
									? "text-white"
									: "text-slate-500 dark:text-on-surface-variant hover:text-blue-600"
							}`}
						>
							<Briefcase className="w-4 h-4" />
							Portfolio
						</Link>
					)}
					<Link
						href="/marketplace"
						data-switcher="marketplace"
						className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${
							isMarketplace || !user
								? "text-white"
								: "text-slate-500 dark:text-on-surface-variant hover:text-blue-600"
						}`}
					>
						<ShoppingBag className="w-4 h-4" />
						Marketplace
					</Link>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-3">
					{user && (
						<button className="p-2 hover:bg-slate-50 dark:hover:bg-surface-container transition-all rounded-full icon-btn-hover">
							<Bell className="w-5 h-5 text-on-surface" />
						</button>
					)}
					{/* User avatar + name */}
					{user ? (
						<>
							<UserAvatar
								name={user.name}
								displayName={user.displayName}
								username={user.username}
								avatar={user.avatar}
								ownerId={user.id}
								size="md"
								showLabel
								className="hidden sm:flex"
							/>
							<UserAvatar
								name={user.name}
								avatar={user.avatar}
								ownerId={user.id}
								size="md"
								className="sm:hidden"
							/>
							<button
								onClick={logout}
								title="Log out"
								className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all rounded-full"
							>
								<LogOut className="w-4 h-4" />
							</button>
						</>
					) : (
						<Link
							href="/login"
							className="text-m font-bold uppercase tracking-widest text-primary hover:underline"
						>
							Log In
						</Link>
					)}
				</div>
			</div>
			{/* Divider */}
			<div className="bg-[#f5f5f5] dark:bg-outline-variant h-px w-full" />
		</header>
	);
}
