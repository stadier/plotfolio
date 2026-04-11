"use client";

import { useAuth } from "@/components/AuthContext";
import UserAvatar from "@/components/ui/UserAvatar";
import { Bell, Briefcase, ShoppingBag } from "lucide-react";
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
			className="absolute top-0.5 rounded-full shadow-sm transition-all duration-300 ease-in-out"
			style={{ ...style, backgroundColor: bg }}
		/>
	);
}

export default function Header() {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");
	const { user, logout } = useAuth();

	return (
		<header className="sticky top-0 z-30 shrink-0 bg-background">
			<div className="relative flex items-center justify-between px-6 py-3 w-full">
				{/* Portfolio / Marketplace switcher */}
				<div className="hidden md:flex items-center relative bg-surface-container rounded-full p-0.5">
					<SwitcherPill isMarketplace={isMarketplace} hasUser={!!user} />
					{user && (
						<Link
							href="/portfolio"
							data-switcher="portfolio"
							className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors duration-300 ${
								!isMarketplace
									? "text-white"
									: "text-on-surface-variant hover:text-blue-600"
							}`}
						>
							<Briefcase className="w-3.5 h-3.5" />
							Portfolio
						</Link>
					)}
					<Link
						href="/marketplace"
						data-switcher="marketplace"
						className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors duration-300 ${
							isMarketplace || !user
								? "text-white"
								: "text-on-surface-variant hover:text-blue-600"
						}`}
					>
						<ShoppingBag className="w-3.5 h-3.5" />
						Marketplace
					</Link>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2">
					{user && (
						<button className="p-1.5 hover:bg-surface-container transition-all rounded-full">
							<Bell className="w-4 h-4 text-on-surface-variant" />
						</button>
					)}
					{user ? (
						<UserAvatar
							name={user.name}
							avatar={user.avatar}
							ownerId={user.id}
							size="sm"
						/>
					) : (
						<Link
							href="/login"
							className="text-[13px] font-semibold text-primary hover:underline"
						>
							Log In
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
