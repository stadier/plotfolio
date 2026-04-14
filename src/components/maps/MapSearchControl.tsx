"use client";

import { GeocodeResult } from "@/lib/geocode";
import { Crosshair, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MapSearchControlProps {
	onLocationSelect: (lat: number, lng: number, label?: string) => void;
	onLocateMe: () => void;
	className?: string;
}

export default function MapSearchControl({
	onLocationSelect,
	onLocateMe,
	className = "",
}: MapSearchControlProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GeocodeResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isLocating, setIsLocating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>();

	// Focus input when expanded
	useEffect(() => {
		if (isExpanded && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isExpanded]);

	// Close on outside click
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				if (!query) setIsExpanded(false);
				setResults([]);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [query]);

	const search = useCallback(async (q: string) => {
		if (q.trim().length < 2) {
			setResults([]);
			return;
		}
		setIsSearching(true);
		try {
			const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
			if (res.ok) {
				const data: GeocodeResult[] = await res.json();
				setResults(data);
			}
		} catch {
			// silently fail
		} finally {
			setIsSearching(false);
		}
	}, []);

	const handleInputChange = (value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => search(value), 400);
	};

	const handleSelect = (result: GeocodeResult) => {
		onLocationSelect(
			parseFloat(result.lat),
			parseFloat(result.lon),
			result.display_name,
		);
		setQuery(result.display_name);
		setResults([]);
		setIsExpanded(false);
		setQuery("");
	};

	const handleClose = () => {
		setQuery("");
		setResults([]);
		setIsExpanded(false);
	};

	const handleLocateMe = () => {
		setIsLocating(true);
		onLocateMe();
		// Reset after a short delay — parent handles the actual geolocation
		setTimeout(() => setIsLocating(false), 3000);
	};

	return (
		<div ref={containerRef} className={`flex items-start gap-2 ${className}`}>
			{/* Search control */}
			<div className="relative">
				<div
					className={`bg-glass backdrop-blur-sm shadow-md transition-all duration-300 ease-in-out overflow-hidden ${
						isExpanded
							? "w-64 sm:w-72 rounded-xl"
							: "w-9 h-9 rounded-full cursor-pointer"
					}`}
				>
					{isExpanded ? (
						<div className="flex items-center px-3 py-2 gap-2">
							{isSearching ? (
								<Loader2 className="w-4 h-4 text-outline shrink-0 animate-spin" />
							) : (
								<Search className="w-4 h-4 text-outline shrink-0" />
							)}
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => handleInputChange(e.target.value)}
								placeholder="Search location..."
								className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline outline-none min-w-0"
							/>
							<button
								onClick={handleClose}
								className="text-outline hover:text-on-surface-variant shrink-0"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					) : (
						<button
							onClick={() => setIsExpanded(true)}
							className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container-high rounded-full transition-colors"
							title="Search location"
						>
							<Search className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Results dropdown */}
				{isExpanded && results.length > 0 && (
					<div className="absolute top-full left-0 right-0 mt-1 bg-glass backdrop-blur-sm rounded-xl shadow-lg border border-border/50 max-h-60 overflow-y-auto z-10">
						{results.map((result, i) => (
							<button
								key={`${result.place_id}-${i}`}
								onClick={() => handleSelect(result)}
								className="w-full text-left px-3 py-2.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors first:rounded-t-xl last:rounded-b-xl border-b border-border/30 last:border-b-0"
							>
								<span className="line-clamp-2">{result.display_name}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Locate me button */}
			<button
				onClick={handleLocateMe}
				disabled={isLocating}
				className="w-9 h-9 bg-glass backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
				title="Go to my location"
			>
				{isLocating ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					<Crosshair className="w-4 h-4" />
				)}
			</button>
		</div>
	);
}
