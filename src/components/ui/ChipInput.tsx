"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChipInputProps {
	/** Currently selected values */
	value: string[];
	/** Called when chips change */
	onChange: (value: string[]) => void;
	/** Predefined suggestions to show while typing */
	suggestions?: string[];
	/** Placeholder for the text input */
	placeholder?: string;
	/** Format a raw value into a display label */
	formatLabel?: (value: string) => string;
}

export default function ChipInput({
	value,
	onChange,
	suggestions = [],
	placeholder = "Type to search or add…",
	formatLabel,
}: ChipInputProps) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const label = (v: string) => (formatLabel ? formatLabel(v) : v);

	// Filter suggestions: not already selected, matches query
	const filtered = suggestions.filter(
		(s) =>
			!value.includes(s) &&
			label(s).toLowerCase().includes(query.toLowerCase()),
	);

	// Whether the typed query is a brand-new value (not in suggestions)
	const isCustom =
		query.trim() !== "" &&
		!suggestions.some(
			(s) => label(s).toLowerCase() === query.trim().toLowerCase(),
		);

	const visibleOptions = [
		...filtered,
		...(isCustom ? [`__custom__${query.trim()}`] : []),
	];

	useEffect(() => {
		setHighlightIdx(-1);
	}, [query]);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	function addChip(raw: string) {
		const val = raw.startsWith("__custom__") ? raw.slice(10) : raw;
		if (!val.trim() || value.includes(val)) return;
		onChange([...value, val]);
		setQuery("");
		setOpen(false);
		inputRef.current?.focus();
	}

	function removeChip(chip: string) {
		onChange(value.filter((v) => v !== chip));
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			if (highlightIdx >= 0 && highlightIdx < visibleOptions.length) {
				addChip(visibleOptions[highlightIdx]);
			} else if (query.trim()) {
				// Add best match or custom
				if (filtered.length > 0) {
					addChip(filtered[0]);
				} else {
					addChip(query.trim());
				}
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightIdx((i) => Math.min(i + 1, visibleOptions.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightIdx((i) => Math.max(i - 1, 0));
		} else if (e.key === "Escape") {
			setOpen(false);
		} else if (e.key === "Backspace" && query === "" && value.length > 0) {
			removeChip(value[value.length - 1]);
		}
	}

	return (
		<div ref={containerRef} className="relative">
			{/* Chip display + input */}
			<div
				className={
					"flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 " +
					"bg-white dark:bg-surface-container border-slate-200 dark:border-outline-variant " +
					"focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors"
				}
				onClick={() => inputRef.current?.focus()}
			>
				{value.map((chip) => (
					<span
						key={chip}
						className={
							"inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium " +
							"bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-blue-300 dark:border-primary/30"
						}
					>
						{label(chip)}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								removeChip(chip);
							}}
							className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
						>
							<X className="w-3 h-3" />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					type="text"
					className={
						"flex-1 min-w-[120px] bg-transparent outline-none text-sm " +
						"text-slate-800 dark:text-on-surface placeholder:text-slate-400 dark:placeholder:text-on-surface-variant"
					}
					placeholder={value.length === 0 ? placeholder : "Add more…"}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={handleKeyDown}
				/>
			</div>

			{/* Dropdown */}
			{open && visibleOptions.length > 0 && (
				<ul
					className={
						"absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-xl border shadow-lg " +
						"bg-white dark:bg-surface-container-high border-slate-200 dark:border-outline-variant"
					}
				>
					{visibleOptions.map((opt, idx) => {
						const isCustomOpt = opt.startsWith("__custom__");
						const displayLabel = isCustomOpt ? opt.slice(10) : label(opt);
						return (
							<li
								key={opt}
								onMouseDown={(e) => {
									e.preventDefault();
									addChip(opt);
								}}
								onMouseEnter={() => setHighlightIdx(idx)}
								className={
									"px-3 py-2 text-sm cursor-pointer transition-colors " +
									(idx === highlightIdx
										? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
										: "text-slate-700 dark:text-on-surface hover:bg-slate-50 dark:hover:bg-surface-container")
								}
							>
								{isCustomOpt ? (
									<>
										Create &ldquo;
										<span className="font-semibold">{displayLabel}</span>
										&rdquo;
									</>
								) : (
									displayLabel
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
