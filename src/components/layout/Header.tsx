"use client";

import UserAvatar from "@/components/ui/UserAvatar";
import { Bell, Briefcase, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
	const pathname = usePathname();
	const isMarketplace = pathname.startsWith("/marketplace");

	return (
		<header className="fixed top-0 w-full z-50 bg-white dark:bg-surface-container-low border-b border-slate-200 dark:border-outline-variant">
			<div className="flex items-center justify-between px-8 py-4 w-full">
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

				{/* Portfolio / Marketplace switcher */}
				<div className="hidden md:flex items-center bg-slate-100 dark:bg-surface-container rounded-full p-1">
					<Link
						href="/portfolio"
						className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
							!isMarketplace
								? "bg-primary text-on-primary shadow-sm"
								: "text-slate-500 dark:text-on-surface-variant hover:text-primary"
						}`}
					>
						<Briefcase className="w-4 h-4" />
						Portfolio
					</Link>
					<Link
						href="/marketplace"
						className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
							isMarketplace
								? "bg-primary text-on-primary shadow-sm"
								: "text-slate-500 dark:text-on-surface-variant hover:text-primary"
						}`}
					>
						<ShoppingBag className="w-4 h-4" />
						Marketplace
					</Link>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<button className="p-2 hover:bg-slate-50 dark:hover:bg-surface-container transition-all rounded-full icon-btn-hover">
						<Bell className="w-5 h-5 text-on-surface" />
					</button>
					{/* User avatar + name */}
					<UserAvatar
						name="Property Owner"
						displayName="Property Owner"
						username="plotfolio_user"
						avatar="https://api.dicebear.com/9.x/initials/svg?seed=PO&backgroundColor=1e3a5f"
						ownerId="owner-1"
						size="md"
						showLabel
						className="hidden sm:flex"
					/>
					<UserAvatar
						name="Property Owner"
						avatar="https://api.dicebear.com/9.x/initials/svg?seed=PO&backgroundColor=1e3a5f"
						ownerId="owner-1"
						size="md"
						className="sm:hidden"
					/>
				</div>
			</div>
			{/* Divider */}
			<div className="bg-[#f5f5f5] dark:bg-outline-variant h-px w-full" />
		</header>
	);
}
