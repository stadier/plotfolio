"use client";

import React, {
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

interface MasonryGridProps {
	/** Minimum width of each column in pixels. Columns are added when space allows. */
	minColWidth?: number;
	/** Gap between columns and rows in pixels */
	gap?: number;
	children: ReactNode;
}

/**
 * Dynamic masonry layout: measures available width and fits as many
 * columns as possible (each at least `minColWidth` px wide). Items
 * are dealt round-robin into independent vertical stacks, so a tall
 * card in one column doesn't affect adjacent columns.
 */
export default function MasonryGrid({
	minColWidth = 340,
	gap = 20,
	children,
}: MasonryGridProps) {
	const items = React.Children.toArray(children);
	const containerRef = useRef<HTMLDivElement>(null);
	const [numCols, setNumCols] = useState(1);

	const updateCols = useCallback(() => {
		if (!containerRef.current) return;
		const width = containerRef.current.offsetWidth;
		// How many columns of minColWidth fit, accounting for gaps between them?
		const cols = Math.max(1, Math.floor((width + gap) / (minColWidth + gap)));
		setNumCols(cols);
	}, [minColWidth, gap]);

	useEffect(() => {
		updateCols();
		const ro = new ResizeObserver(updateCols);
		if (containerRef.current) ro.observe(containerRef.current);
		return () => ro.disconnect();
	}, [updateCols]);

	// Round-robin distribute items into columns
	const columns: ReactNode[][] = Array.from({ length: numCols }, () => []);
	items.forEach((child, i) => {
		columns[i % numCols].push(child);
	});

	return (
		<div
			ref={containerRef}
			className="flex items-start"
			style={{ gap: `${gap}px` }}
		>
			{columns.map((col, ci) => (
				<div
					key={ci}
					className="flex flex-col flex-1 min-w-0"
					style={{ gap: `${gap}px` }}
				>
					{col}
				</div>
			))}
		</div>
	);
}
