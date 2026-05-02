"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Property, PropertyStatus } from "@/types/property";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Compact dark-mode style for Google Static Maps (subtle slate look)
const GOOGLE_DARK_STYLE = [
	"feature:all|element:geometry|color:0x1e293b",
	"feature:all|element:labels|visibility:off",
	"feature:road|element:geometry|color:0x334155",
	"feature:water|element:geometry|color:0x0f172a",
	"feature:landscape|element:geometry|color:0x1e293b",
	"feature:poi|element:geometry|color:0x1e293b",
];
const GOOGLE_LIGHT_STYLE = [
	"feature:all|element:labels|visibility:off",
	"feature:poi|element:geometry|color:0xf1f5f9",
];

function buildStyleParams(styles: string[]): string {
	return styles.map((s) => `style=${encodeURIComponent(s)}`).join("&");
}

interface MiniMapWidgetProps {
	properties: Property[];
	onSelect: (id: string) => void;
}

/** Resolve the state/region label for a property — prefer the explicit field, fall back to address parsing. */
function resolveState(p: Property): string | null {
	if (p.state) return p.state;
	// If no explicit state, try to extract region from address
	if (p.address) {
		const parts = p.address.split(",").map((s) => s.trim());
		// Use second-to-last part as region (common address format: street, city, state, country)
		if (parts.length >= 3) return parts[parts.length - 2];
	}
	return null;
}

interface LocationGroup {
	label: string;
	properties: Property[];
}

const SLIDE_INTERVAL = 5000;

/** Toggle to show/hide the SVG grid overlay on top of the map backdrop. */
const SHOW_GRID = false;

export default function MiniMapWidget({
	properties,
	onSelect,
}: MiniMapWidgetProps) {
	const mapW = 280;
	const mapH = 160;

	const mappable = useMemo(
		() =>
			properties.filter(
				(p) =>
					p.coordinates?.lat != null &&
					p.coordinates?.lng != null &&
					// Treat (0,0) as missing — Null Island sentinel
					!(p.coordinates.lat === 0 && p.coordinates.lng === 0),
			),
		[properties],
	);

	// Group properties by state field (or address fallback); unmatched go to "Other"
	const locationGroups: LocationGroup[] = useMemo(() => {
		const stateMap = new Map<string, Property[]>();
		const other: Property[] = [];

		for (const p of mappable) {
			const state = resolveState(p);
			if (state) {
				if (!stateMap.has(state)) stateMap.set(state, []);
				stateMap.get(state)!.push(p);
			} else {
				other.push(p);
			}
		}

		const groups: LocationGroup[] = [];
		for (const [label, props] of stateMap) {
			groups.push({ label, properties: props });
		}
		if (other.length > 0) {
			groups.push({ label: "Other", properties: other });
		}
		if (groups.length === 0) {
			groups.push({ label: "All Locations", properties: mappable });
		}
		return groups;
	}, [mappable]);

	const [activeIdx, setActiveIdx] = useState(0);
	const [slideDir, setSlideDir] = useState<"left" | "right">("left");
	const [slideKey, setSlideKey] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const slideCount = locationGroups.length;

	const goNext = useCallback(() => {
		setSlideDir("left");
		setSlideKey((k) => k + 1);
		setActiveIdx((prev) => (prev + 1) % slideCount);
	}, [slideCount]);

	const goPrev = useCallback(() => {
		setSlideDir("right");
		setSlideKey((k) => k + 1);
		setActiveIdx((prev) => (prev - 1 + slideCount) % slideCount);
	}, [slideCount]);

	const goTo = useCallback(
		(i: number) => {
			setSlideDir(i > activeIdx ? "left" : "right");
			setSlideKey((k) => k + 1);
			setActiveIdx(i);
		},
		[activeIdx],
	);

	// Auto-advance slideshow
	useEffect(() => {
		if (slideCount > 1) {
			timerRef.current = setInterval(goNext, SLIDE_INTERVAL);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [slideCount, goNext]);

	const current = locationGroups[activeIdx] ?? locationGroups[0];
	const currentProps = current?.properties ?? [];

	// Compute bounds for current group
	const lats = currentProps.map((p) => p.coordinates.lat);
	const lngs = currentProps.map((p) => p.coordinates.lng);
	const latCenter = lats.reduce((a, b) => a + b, 0) / (lats.length || 1);
	const lngCenter = lngs.reduce((a, b) => a + b, 0) / (lngs.length || 1);
	const pad = 0.02;
	const latMin = Math.min(...lats, latCenter - pad);
	const latMax = Math.max(...lats, latCenter + pad);
	const lngMin = Math.min(...lngs, lngCenter - pad);
	const lngMax = Math.max(...lngs, lngCenter + pad);
	const latRange = latMax - latMin || 0.04;
	const lngRange = lngMax - lngMin || 0.04;

	const slideClass =
		slideDir === "left" ? "animate-slide-left" : "animate-slide-right";

	const { resolvedTheme } = useTheme();

	// Build a Static Map URL for the current bounds (backdrop behind grid).
	// Prefers Mapbox if a token is set, otherwise falls back to Google Static Maps
	// (the project's primary map provider).
	const staticMapUrl = useMemo(() => {
		// No real property coordinates → skip; don't render Null Island
		if (lats.length === 0 || lngs.length === 0) return null;

		const lngPad = lngRange * 0.15;
		const latPad = latRange * 0.15;
		const minLng = lngMin - lngPad;
		const minLat = latMin - latPad;
		const maxLng = lngMax + lngPad;
		const maxLat = latMax + latPad;

		if (MAPBOX_TOKEN) {
			const style = resolvedTheme === "dark" ? "dark-v11" : "light-v11";
			const bbox = `[${minLng},${minLat},${maxLng},${maxLat}]`;
			return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${bbox}/600x352@2x?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
		}

		if (GOOGLE_KEY) {
			const visible = `${minLat},${minLng}|${maxLat},${maxLng}`;
			const styles =
				resolvedTheme === "dark" ? GOOGLE_DARK_STYLE : GOOGLE_LIGHT_STYLE;
			return `https://maps.googleapis.com/maps/api/staticmap?size=600x352&scale=2&maptype=roadmap&visible=${visible}&${buildStyleParams(styles)}&key=${GOOGLE_KEY}`;
		}

		return null;
	}, [
		resolvedTheme,
		lngMin,
		lngMax,
		latMin,
		latMax,
		lngRange,
		latRange,
		lats.length,
		lngs.length,
	]);

	return (
		<div className="bg-card border border-border sz-radius-card overflow-hidden break-inside-avoid widget-card animate-fade-in-up">
			{/* Header — padded */}
			<div className="flex items-center justify-between px-(--size-card-px) pt-(--size-card-py) mb-3">
				<div className="flex items-center sz-gap">
					<div className="sz-icon-box rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
						<Globe className="sz-icon text-blue-600 dark:text-blue-400" />
					</div>
					<span className="typo-caption font-semibold text-on-surface-variant">
						Property Map
					</span>
				</div>
				<Link
					href="/portfolio/map"
					className="typo-badge font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors"
				>
					Expand →
				</Link>
			</div>

			{/* Location label + controls — padded */}
			<div className="flex items-center justify-between mb-2 px-(--size-card-px)">
				<button
					type="button"
					onClick={goPrev}
					className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-surface-container transition-colors"
					aria-label="Previous location"
				>
					<ChevronLeft className="w-3.5 h-3.5 text-on-surface-variant" />
				</button>
				<div
					key={slideKey}
					className={`text-center min-w-0 flex-1 px-1 ${slideClass}`}
				>
					<p className="typo-caption font-bold text-on-surface truncate">
						{current.label}
					</p>
					<p className="typo-badge text-on-surface-variant">
						{currentProps.length}{" "}
						{currentProps.length === 1 ? "property" : "properties"}
					</p>
				</div>
				<button
					type="button"
					onClick={goNext}
					className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-surface-container transition-colors"
					aria-label="Next location"
				>
					<ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
				</button>
			</div>

			{/* SVG mini map — bleeds to left, right, bottom */}
			<div
				className={`relative bg-slate-50 dark:bg-surface-container overflow-hidden ${
					locationGroups.length > 1 ? "" : "rounded-b-(--radius-card)"
				}`}
			>
				{staticMapUrl && (
					<img
						key={staticMapUrl}
						src={staticMapUrl}
						alt=""
						aria-hidden
						className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
					/>
				)}
				<svg
					key={slideKey}
					viewBox={`0 0 ${mapW} ${mapH}`}
					preserveAspectRatio="none"
					className={`relative w-full h-44 block ${slideClass}`}
				>
					{/* Grid lines */}
					{SHOW_GRID &&
						Array.from({ length: 6 }, (_, i) => (
							<line
								key={`h${i}`}
								x1={0}
								y1={(i * mapH) / 5}
								x2={mapW}
								y2={(i * mapH) / 5}
								stroke="var(--chart-grid)"
								strokeWidth="0.5"
							/>
						))}
					{SHOW_GRID &&
						Array.from({ length: 8 }, (_, i) => (
							<line
								key={`v${i}`}
								x1={(i * mapW) / 7}
								y1={0}
								x2={(i * mapW) / 7}
								y2={mapH}
								stroke="var(--chart-grid)"
								strokeWidth="0.5"
							/>
						))}
					{/* Property pins */}
					{currentProps.map((p, idx) => {
						const x =
							10 + ((p.coordinates.lng - lngMin) / lngRange) * (mapW - 20);
						const y =
							mapH -
							10 -
							((p.coordinates.lat - latMin) / latRange) * (mapH - 20);
						const isOwned = p.status === PropertyStatus.OWNED;
						return (
							<g
								key={p.id}
								onClick={() => onSelect(p.id)}
								className="cursor-pointer"
							>
								<circle
									cx={x}
									cy={y}
									r="10"
									fill={
										isOwned
											? "var(--chart-pin-owned)"
											: "var(--chart-pin-default)"
									}
									opacity="0.15"
								/>
								<circle
									cx={x}
									cy={y}
									r="4"
									fill={
										isOwned
											? "var(--chart-pin-owned)"
											: "var(--chart-pin-default)"
									}
								/>
								<text
									x={x}
									y={y - 14}
									textAnchor="middle"
									fill="var(--chart-label)"
									fontSize="8"
									fontWeight="600"
								>
									{idx + 1}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			{/* Slide dots — overlaid on map area */}
			{locationGroups.length > 1 && (
				<div className="flex items-center justify-center gap-1 py-2 bg-slate-50 dark:bg-surface-container rounded-b-(--radius-card)">
					{locationGroups.map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => goTo(i)}
							className={`w-1.5 h-1.5 rounded-full transition-all ${
								i === activeIdx
									? "bg-primary w-3"
									: "bg-slate-300 dark:bg-outline-variant"
							}`}
							aria-label={`Go to ${locationGroups[i].label}`}
						/>
					))}
				</div>
			)}
		</div>
	);
}
