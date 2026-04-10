"use client";

import { type ReactNode } from "react";

interface AnalyticsChartCardProps {
	title: string;
	subtitle?: string;
	badge?: string;
	badgeColor?: string;
	children: ReactNode;
	className?: string;
}

export default function AnalyticsChartCard({
	title,
	subtitle,
	badge,
	badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
	children,
	className = "",
}: AnalyticsChartCardProps) {
	return (
		<div
			className={`bg-card rounded-2xl border border-border p-5 max-w-3xl ${className}`}
		>
			<div className="flex items-center justify-between mb-1">
				<h3 className="text-sm font-semibold text-on-surface">{title}</h3>
				{badge && (
					<span
						className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeColor}`}
					>
						{badge}
					</span>
				)}
			</div>
			{subtitle && (
				<p className="text-xs text-on-surface-variant mb-4">{subtitle}</p>
			)}
			{children}
		</div>
	);
}
