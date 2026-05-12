"use client";

import { usePropertyViewLayout } from "@/hooks/usePropertyViewLayout";
import { LayoutPanelTop, Rows3 } from "lucide-react";

interface Props {
	className?: string;
}

/**
 * Compact toggle that switches the property detail left column between
 * stacked sections and a tabbed view. Designed to live in the page header
 * next to the back button.
 */
export default function PropertyViewLayoutToggle({ className = "" }: Props) {
	const [layout, setLayout] = usePropertyViewLayout();

	return (
		<div
			className={`hidden lg:inline-flex items-center rounded-md bg-surface-container p-0.5 ${className}`}
		>
			<button
				type="button"
				aria-label="Stacked view"
				aria-pressed={layout === "stacked"}
				onClick={() => setLayout("stacked")}
				title="Stacked view"
				className={`p-1.5 rounded-md transition-colors ${
					layout === "stacked"
						? "bg-card text-primary shadow-sm"
						: "text-on-surface-variant hover:text-on-surface"
				}`}
			>
				<Rows3 className="w-4 h-4" />
			</button>
			<button
				type="button"
				aria-label="Tabbed view"
				aria-pressed={layout === "tabs"}
				onClick={() => setLayout("tabs")}
				title="Tabbed view"
				className={`p-1.5 rounded-md transition-colors ${
					layout === "tabs"
						? "bg-card text-primary shadow-sm"
						: "text-on-surface-variant hover:text-on-surface"
				}`}
			>
				<LayoutPanelTop className="w-4 h-4" />
			</button>
		</div>
	);
}
