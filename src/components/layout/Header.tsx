"use client";

import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const topNavItems = [
	{ name: "Dashboard", href: "/" },
	{ name: "Properties", href: "/properties" },
	{ name: "Map View", href: "/map" },
	{ name: "Portfolio", href: "/portfolio" },
];

export default function Header() {
	const pathname = usePathname();

	return (
		<header className="fixed top-0 w-full z-50 bg-white shadow-sm">
			<div className="flex items-center justify-between px-8 py-4 w-full">
				{/* Logo */}
				<div className="text-2xl font-bold tracking-tighter text-primary font-headline">
					Plotfolio
				</div>

				{/* Top nav links */}
				<nav className="hidden md:flex items-center gap-8">
					{topNavItems.map((item) => {
						const isActive =
							item.href === "/"
								? pathname === "/"
								: pathname.startsWith(item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`font-headline font-semibold text-sm tracking-tight transition-colors ${
									isActive
										? "text-primary border-b-2 border-primary pb-1"
										: "text-slate-500 hover:text-primary"
								}`}
							>
								{item.name}
							</Link>
						);
					})}
				</nav>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<button className="p-2 hover:bg-slate-50 transition-all rounded-full">
						<Bell className="w-5 h-5 text-on-surface" />
					</button>
					<button className="p-2 hover:bg-slate-50 transition-all rounded-full">
						<Settings className="w-5 h-5 text-on-surface" />
					</button>
					{/* Avatar placeholder */}
					<div className="w-9 h-9 rounded-full signature-gradient flex items-center justify-center text-white text-sm font-bold font-headline shrink-0">
						U
					</div>
				</div>
			</div>
			{/* Divider */}
			<div className="bg-[#f5f5f5] h-px w-full" />
		</header>
	);
}
