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
	/** Maximum number of columns */
	maxCols?: number;
	/** Gap between columns and rows in pixels */
	gap?: number;
	/**
	 * Maximum width a column will grow to in pixels. Beyond this, extra
	 * horizontal space is left empty on the right (top-left alignment).
	 * Defaults to `minColWidth * 1.4`.
	 */
	maxColWidth?: number;
	/**
	 * Optional explicit responsive breakpoints. Each entry caps the column
	 * count when the container is at most `maxWidth` px wide. The smallest
	 * matching breakpoint wins. Example:
	 *   [
	 *     { maxWidth: 640,  cols: 1 },
	 *     { maxWidth: 960,  cols: 2 },
	 *     { maxWidth: 1280, cols: 3 },
	 *   ]
	 * Above the largest `maxWidth`, the natural `minColWidth` / `maxCols`
	 * rules apply.
	 */
	breakpoints?: { maxWidth: number; cols: number }[];
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
	maxCols,
	gap = 20,
	maxColWidth,
	breakpoints,
	children,
}: MasonryGridProps) {
	const items = React.Children.toArray(children);
	const containerRef = useRef<HTMLDivElement>(null);
	const [numCols, setNumCols] = useState(1);
	const [colWidth, setColWidth] = useState(minColWidth);

	const effectiveMax = maxColWidth ?? Math.round(minColWidth * 1.4);

	// Sort breakpoints ascending once per render so the smallest match wins.
	const sortedBreakpoints = breakpoints
		? [...breakpoints].sort((a, b) => a.maxWidth - b.maxWidth)
		: undefined;

	const updateCols = useCallback(() => {
		if (!containerRef.current) return;
		const width = containerRef.current.offsetWidth;
		// How many columns of minColWidth fit, accounting for gaps between them?
		let cols = Math.max(1, Math.floor((width + gap) / (minColWidth + gap)));
		if (maxCols) cols = Math.min(cols, maxCols);
		// Apply explicit responsive breakpoints (smallest match wins).
		if (sortedBreakpoints) {
			const match = sortedBreakpoints.find((bp) => width <= bp.maxWidth);
			if (match) cols = Math.min(cols, match.cols);
		}
		// Grow each column up to effectiveMax to consume available width,
		// but never beyond — extra space is left empty on the right.
		const available = (width - gap * (cols - 1)) / cols;
		const next = Math.max(minColWidth, Math.min(effectiveMax, available));
		setNumCols(cols);
		setColWidth(next);
	}, [minColWidth, maxCols, gap, effectiveMax, sortedBreakpoints]);

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
			className="flex items-start justify-start flex-wrap"
			style={{ gap: `${gap}px` }}
		>
			{columns.map((col, ci) => (
				<div
					key={ci}
					className="flex flex-col min-w-0"
					style={{ gap: `${gap}px`, width: `${colWidth}px` }}
				>
					{col}
				</div>
			))}
		</div>
	);
}
