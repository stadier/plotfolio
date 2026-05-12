"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface PropertyQuickAction {
	/** Short label shown under or beside the icon (e.g. "Initiate Sale"). */
	label: string;
	/** Lucide icon component. */
	icon: LucideIcon;
	/** Optional helper text shown below the label. Keep it short. */
	description?: string;
	/** Internal route. If set, renders as a `<Link>`. */
	href?: string;
	/** Click handler. Used when `href` is not provided. */
	onClick?: () => void;
	/** Highlight as the recommended action (blue accent). */
	primary?: boolean;
	/** Render in a destructive/red style (e.g. delete). */
	destructive?: boolean;
	/** Disable the action. */
	disabled?: boolean;
}

interface PropertyQuickActionsProps {
	actions: PropertyQuickAction[];
	className?: string;
}

/**
 * Compact, legible grid of property quick actions used inside the
 * Overview section of `PropertyFullView`. Each action is rendered as a
 * card-style button with an icon, label, and optional one-line helper.
 */
export default function PropertyQuickActions({
	actions,
	className = "",
}: PropertyQuickActionsProps) {
	if (!actions || actions.length === 0) return null;

	return (
		<section className={className}>
			<h2 className="font-headline text-base font-semibold text-on-surface mb-3">
				Quick Actions
			</h2>
			<div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(0,260px))]">
				{actions.map((action) => (
					<QuickActionButton key={action.label} action={action} />
				))}
			</div>
		</section>
	);
}

function QuickActionButton({ action }: { action: PropertyQuickAction }) {
	const Icon = action.icon;

	const base =
		"group flex items-center gap-3 px-4 py-3.5 rounded-md border text-left transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

	const tone = action.destructive
		? "border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 dark:bg-red-500/10 dark:border-red-500/30 dark:hover:bg-red-500/20"
		: action.primary
			? "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30 dark:hover:bg-blue-500/20"
			: "border-border bg-card hover:bg-surface-container hover:border-primary/30";

	const iconWrap = action.destructive
		? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
		: action.primary
			? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
			: "bg-surface-container text-primary group-hover:bg-card";

	const labelTone = action.destructive
		? "text-red-700 dark:text-red-300"
		: "text-on-surface";

	const content = (
		<>
			<span
				className={`flex items-center justify-center w-11 h-11 rounded-md shrink-0 transition-colors ${iconWrap}`}
			>
				<Icon className="w-5 h-5" />
			</span>
			<span className="min-w-0 flex-1">
				<span
					className={`block text-sm font-semibold leading-tight ${labelTone}`}
				>
					{action.label}
				</span>
				{action.description && (
					<span className="block text-xs text-on-surface-variant leading-snug mt-0.5">
						{action.description}
					</span>
				)}
			</span>
		</>
	);

	if (action.href && !action.disabled) {
		return (
			<Link
				href={action.href}
				className={`${base} ${tone}`}
				title={action.label}
			>
				{content}
			</Link>
		);
	}

	return (
		<button
			type="button"
			onClick={action.onClick}
			disabled={action.disabled}
			className={`${base} ${tone}`}
			title={action.label}
		>
			{content}
		</button>
	);
}
