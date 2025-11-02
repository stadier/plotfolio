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

interface SidebarProps {
	className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
	const pathname = usePathname();

	const navigation = [
		{ name: "Dashboard", href: "/", icon: Home },
		{ name: "Properties", href: "/properties", icon: Grid },
		{ name: "Map View", href: "/map", icon: MapPin },
		{ name: "Analytics", href: "/analytics", icon: BarChart3 },
		{ name: "Documents", href: "/documents", icon: FileText },
		{ name: "Settings", href: "/settings", icon: Settings },
		{ name: "Help", href: "/help", icon: HelpCircle },
	];

	return (
		<div className={`bg-white border-r border-gray-200 ${className}`}>
			{/* Logo */}
			<div className="flex items-center justify-center py-6 px-4 border-b border-gray-200">
				<div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
					<Home className="w-6 h-6 text-white" />
				</div>
			</div>

			{/* Navigation */}
			<nav className="mt-6 px-3">
				<ul className="space-y-2">
					{navigation.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;

						return (
							<li key={item.name}>
								<Link
									href={item.href}
									className={`
                    flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
											isActive
												? "bg-gray-900 text-white"
												: "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
										}
                  `}
								>
									<Icon className="w-5 h-5 mr-3" />
									{item.name}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
		</div>
	);
}
