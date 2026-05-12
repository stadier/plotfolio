"use client";

import { useChildProperties } from "@/hooks/usePropertyQueries";
import {
	cn,
	formatAreaCompact,
	formatCurrency,
	formatCurrencyCompact,
	getPropertyMedia,
} from "@/lib/utils";
import {
	Property,
	PropertyContainerKind,
	PropertyStatus,
} from "@/types/property";
import {
	Building2,
	CheckCircle2,
	Layers,
	MapPin,
	Plus,
	Rows3,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

interface EstateCardProps {
	estate: Property;
	onSelect?: (id: string) => void;
	className?: string;
}

const KIND_LABELS: Record<PropertyContainerKind, string> = {
	[PropertyContainerKind.ESTATE]: "Estate",
	[PropertyContainerKind.PHASE]: "Phase",
	[PropertyContainerKind.BUILDING]: "Building",
	[PropertyContainerKind.SUBDIVISION]: "Subdivision",
};

const STATUS_LABELS: Partial<Record<PropertyStatus, string>> = {
	[PropertyStatus.OWNED]: "Owned",
	[PropertyStatus.FOR_SALE]: "For sale",
	[PropertyStatus.FOR_RENT]: "For rent",
	[PropertyStatus.FOR_LEASE]: "For lease",
	[PropertyStatus.UNDER_CONTRACT]: "Under contract",
	[PropertyStatus.RESERVED]: "Reserved",
	[PropertyStatus.RENTED]: "Rented",
	[PropertyStatus.LEASED]: "Leased",
	[PropertyStatus.DEVELOPMENT]: "Development",
};

const STATUS_BADGE: Partial<Record<PropertyStatus, string>> = {
	[PropertyStatus.OWNED]: "bg-emerald-100 text-emerald-800",
	[PropertyStatus.FOR_SALE]: "bg-blue-100 text-blue-800",
	[PropertyStatus.FOR_RENT]: "bg-purple-100 text-purple-800",
	[PropertyStatus.FOR_LEASE]: "bg-indigo-100 text-indigo-800",
	[PropertyStatus.UNDER_CONTRACT]: "bg-yellow-100 text-yellow-800",
	[PropertyStatus.RESERVED]: "bg-amber-100 text-amber-800",
	[PropertyStatus.RENTED]: "bg-pink-100 text-pink-800",
	[PropertyStatus.LEASED]: "bg-teal-100 text-teal-800",
	[PropertyStatus.DEVELOPMENT]: "bg-orange-100 text-orange-800",
};

const RESERVED_OR_SOLD_STATUSES = new Set<PropertyStatus>([
	PropertyStatus.UNDER_CONTRACT,
	PropertyStatus.RESERVED,
]);
const LISTED_STATUSES = new Set<PropertyStatus>([
	PropertyStatus.FOR_SALE,
	PropertyStatus.FOR_RENT,
	PropertyStatus.FOR_LEASE,
]);
const HELD_STATUSES = new Set<PropertyStatus>([
	PropertyStatus.OWNED,
	PropertyStatus.RENTED,
	PropertyStatus.LEASED,
	PropertyStatus.DEVELOPMENT,
]);

const HOVER_OPEN_DELAY_MS = 600;
const HOVER_CLOSE_DELAY_MS = 220;

/**
 * EstateCard — specialised PropertyCard variant for container properties
 * (estate / phase / building / subdivision). Uses the same Property model
 * but renders a stacked silhouette + aggregate stats, and on sustained
 * hover lifts above neighbours and expands a side panel listing all child
 * units (lazy-fetched, searchable, sortable).
 */
export default function EstateCard({
	estate,
	onSelect,
	className,
}: EstateCardProps) {
	const cardRef = useRef<HTMLDivElement | null>(null);
	const popoutRef = useRef<HTMLDivElement | null>(null);
	const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [expanded, setExpanded] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [coords, setCoords] = useState<{
		top: number;
		left: number;
		cardHeight: number;
		placement: "right" | "left" | "below";
	} | null>(null);

	// Fetch children eagerly so the aggregate stats (total / available /
	// reserved / from-price / completion) are always accurate on first paint.
	// React Query dedupes across cards, so showing many estates is cheap.
	const { data: units, isLoading } = useChildProperties(estate.id);

	const media = getPropertyMedia(estate);
	const heroImage = media[0]?.url;
	const kindLabel = estate.containerKind
		? KIND_LABELS[estate.containerKind]
		: "Container";

	const stats = useMemo(() => {
		const list = units ?? [];
		const total = list.length;
		const owned = list.filter((u) => HELD_STATUSES.has(u.status)).length;
		const listed = list.filter((u) => LISTED_STATUSES.has(u.status)).length;
		const reserved = list.filter((u) =>
			RESERVED_OR_SOLD_STATUSES.has(u.status),
		).length;
		const completion = (() => {
			const vals = list
				.map((u) => u.structure?.completionPercent)
				.filter((v): v is number => typeof v === "number");
			if (vals.length === 0) return null;
			return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
		})();
		// Total portfolio worth across units (current value preferred, then
		// listing price, then purchase price). When the owner has disabled
		// auto-compute (settings.autoComputeWorth === false), use the
		// container's manually-set currentValue instead of summing children.
		const autoCompute = estate.settings?.autoComputeWorth !== false;
		const totalWorth = autoCompute
			? list.reduce<number | null>((sum, u) => {
					// Treat 0 as "no value set" — schema defaults numeric
					// price fields to 0, so a literal 0 should fall through
					// to the next preference instead of zeroing the total.
					const v =
						(u.currentValue && u.currentValue > 0
							? u.currentValue
							: undefined) ??
						(u.listingPrice && u.listingPrice > 0
							? u.listingPrice
							: undefined) ??
						(u.purchasePrice && u.purchasePrice > 0
							? u.purchasePrice
							: undefined);
					if (v == null) return sum;
					return (sum ?? 0) + v;
				}, null)
			: (estate.currentValue ?? null);
		// Total area across units. When auto-compute is disabled
		// (settings.autoComputeArea === false), use the container's
		// manually-set area instead of summing children.
		const autoComputeArea = estate.settings?.autoComputeArea !== false;
		const totalArea = autoComputeArea
			? list.reduce<number | null>((sum, u) => {
					if (u.area && u.area > 0) return (sum ?? 0) + u.area;
					return sum;
				}, null)
			: (estate.area ?? null);
		return {
			total,
			owned,
			listed,
			reserved,
			completion,
			totalWorth,
			totalArea,
		};
	}, [
		units,
		estate.settings?.autoComputeWorth,
		estate.settings?.autoComputeArea,
		estate.currentValue,
		estate.area,
	]);

	const computeCoords = useCallback(() => {
		if (!cardRef.current) return;
		const rect = cardRef.current.getBoundingClientRect();
		const popoutWidth = 360;
		const gap = 12;
		const viewportWidth = window.innerWidth;
		const spaceRight = viewportWidth - rect.right;
		const spaceLeft = rect.left;
		// Prefer right of the card; fall back to left; only drop below as a
		// last resort when neither side has enough room.
		let placement: "right" | "left" | "below";
		let left: number;
		if (spaceRight >= popoutWidth + gap) {
			placement = "right";
			left = rect.right + gap;
		} else if (spaceLeft >= popoutWidth + gap) {
			placement = "left";
			left = rect.left - popoutWidth - gap;
		} else {
			placement = "below";
			left = Math.max(8, Math.min(rect.left, viewportWidth - popoutWidth - 8));
		}
		setCoords({
			top: rect.top,
			left,
			cardHeight: rect.height,
			placement,
		});
	}, []);

	const openPopout = useCallback(() => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
		if (expanded) return;
		if (openTimer.current) clearTimeout(openTimer.current);
		openTimer.current = setTimeout(() => {
			computeCoords();
			setExpanded(true);
		}, HOVER_OPEN_DELAY_MS);
	}, [computeCoords, expanded]);

	const scheduleClose = useCallback(() => {
		if (openTimer.current) {
			clearTimeout(openTimer.current);
			openTimer.current = null;
		}
		if (closeTimer.current) clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => {
			setExpanded(false);
		}, HOVER_CLOSE_DELAY_MS);
	}, []);

	// Reposition / dismiss on scroll / resize while open.
	useEffect(() => {
		if (!expanded) return;
		const onScroll = (e: Event) => {
			// Ignore scroll events that originate inside the popout itself
			// (otherwise scrolling the units list closes the panel).
			const target = e.target as Node | null;
			if (target && popoutRef.current?.contains(target)) return;
			setExpanded(false);
		};
		const onResize = () => computeCoords();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setExpanded(false);
		};
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onResize);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
			window.removeEventListener("keydown", onKey);
		};
	}, [expanded, computeCoords]);

	useEffect(() => {
		return () => {
			if (openTimer.current) clearTimeout(openTimer.current);
			if (closeTimer.current) clearTimeout(closeTimer.current);
		};
	}, []);

	const handleCardClick = () => {
		if (onSelect) onSelect(estate.id);
	};

	return (
		<>
			{/* Stacked-card silhouette: two ghost layers behind the card to suggest "many". */}
			<div
				className={cn("relative w-full max-w-xl", className)}
				onMouseEnter={() => {
					setHovered(true);
					openPopout();
				}}
				onMouseLeave={() => {
					setHovered(false);
					scheduleClose();
				}}
			>
				{/* Ghost layers */}
				<div
					aria-hidden
					className={cn(
						"absolute inset-x-3 -top-1 h-3 rounded-t-xl bg-card/60 border border-border/60 shadow-sm transition-all duration-200",
						expanded && "-top-2 inset-x-4",
					)}
				/>
				<div
					aria-hidden
					className={cn(
						"absolute inset-x-1.5 -top-0.5 h-2 rounded-t-xl bg-card/80 border border-border/80 shadow-sm transition-all duration-200",
						expanded && "-top-1 inset-x-2.5",
					)}
				/>

				<div
					ref={cardRef}
					onClick={handleCardClick}
					className={cn(
						"relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 will-change-transform",
						"ring-1 ring-primary/10",
						expanded
							? "z-40 shadow-2xl -translate-y-1 scale-[1.01]"
							: "shadow-md hover:shadow-lg",
					)}
				>
					{/* Hero */}
					<div className="relative h-40 bg-surface-container overflow-hidden">
						{heroImage ? (
							<Image
								src={heroImage}
								alt={estate.name}
								fill
								sizes="370px"
								className="object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Building2 className="w-10 h-10 text-outline/60" />
							</div>
						)}
						{/* Container ribbon */}
						<div className="absolute top-2 left-2 flex items-center gap-1.5 bg-blue-600 text-white px-2 py-1 rounded-sm shadow-md">
							<Layers className="w-3.5 h-3.5" />
							<span className="text-[11px] font-bold uppercase tracking-wide">
								{kindLabel}
							</span>
						</div>
						{/* Unit count */}
						{stats.total > 0 && (
							<div className="absolute top-2 right-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm">
								{stats.total} unit{stats.total === 1 ? "" : "s"}
							</div>
						)}
					</div>

					{/* Body */}
					<div className="p-4">
						<h3 className="font-headline font-bold text-on-surface text-base truncate">
							{estate.name}
						</h3>
						<div className="flex items-center gap-1 mt-1 text-outline text-sm">
							<MapPin className="w-3 h-3 shrink-0" />
							<span className="truncate">{estate.address || "No address"}</span>
						</div>

						{/* Aggregate stats */}
						<div className="mt-3 grid grid-cols-3 gap-2">
							<Stat
								label="Owned"
								value={isLoading && !units ? "…" : String(stats.owned)}
								tone="text-emerald-600 dark:text-emerald-300"
							/>
							<Stat
								label="Listed"
								value={isLoading && !units ? "…" : String(stats.listed)}
								tone="text-blue-600 dark:text-blue-300"
							/>
							<Stat
								label={stats.reserved > 0 ? "Reserved" : "Worth"}
								value={
									stats.reserved > 0
										? String(stats.reserved)
										: stats.totalWorth != null
											? formatCurrencyCompact(
													stats.totalWorth,
													estate.country,
													estate.currency,
												)
											: "—"
								}
								tone={
									stats.reserved > 0
										? "text-amber-600 dark:text-amber-300"
										: "text-on-surface"
								}
							/>
						</div>

						{stats.totalArea != null && stats.totalArea > 0 && (
							<div className="mt-2 flex items-center justify-between text-[11px] text-outline">
								<span>Total area</span>
								<span className="font-semibold text-on-surface-variant">
									{formatAreaCompact(stats.totalArea)}
								</span>
							</div>
						)}

						{stats.completion != null && (
							<div className="mt-3">
								<div className="flex items-center justify-between text-[11px] text-outline mb-1">
									<span>Avg. completion</span>
									<span>{stats.completion}%</span>
								</div>
								<div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
									<div
										className="h-full bg-primary"
										style={{ width: `${stats.completion}%` }}
									/>
								</div>
							</div>
						)}

						<div className="mt-3 text-[11px] text-outline italic">
							Hover to browse units →
						</div>
					</div>
				</div>
			</div>

			{expanded && coords && (
				<EstatePopout
					ref={popoutRef}
					estate={estate}
					units={units ?? []}
					loading={isLoading}
					coords={coords}
					onMouseEnter={() => {
						if (closeTimer.current) {
							clearTimeout(closeTimer.current);
							closeTimer.current = null;
						}
					}}
					onMouseLeave={scheduleClose}
					onClose={() => setExpanded(false)}
				/>
			)}
		</>
	);
}
function Stat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: string;
}) {
	return (
		<div className="rounded-md bg-surface-container/60 px-2 py-1.5">
			<div className="text-badge uppercase tracking-wide text-outline">
				{label}
			</div>
			<div className={cn("text-sm font-bold truncate", tone)}>{value}</div>
		</div>
	);
}

interface EstatePopoutProps {
	estate: Property;
	units: Property[];
	loading: boolean;
	coords: {
		top: number;
		left: number;
		cardHeight: number;
		placement: "right" | "left" | "below";
	};
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onClose: () => void;
}

const EstatePopout = forwardRef<HTMLDivElement, EstatePopoutProps>(
	function EstatePopout(
		{ estate, units, loading, coords, onMouseEnter, onMouseLeave, onClose },
		ref,
	) {
		const [query, setQuery] = useState("");
		const [sort, setSort] = useState<"label" | "price" | "status">("label");

		const filteredUnits = useMemo(() => {
			const q = query.trim().toLowerCase();
			let list = units;
			if (q) {
				list = list.filter((u) => {
					return (
						u.name.toLowerCase().includes(q) ||
						(u.unitLabel ?? "").toLowerCase().includes(q) ||
						(u.address ?? "").toLowerCase().includes(q) ||
						(u.status ?? "").toLowerCase().includes(q)
					);
				});
			}
			list = [...list].sort((a, b) => {
				switch (sort) {
					case "price": {
						const pa = a.listingPrice ?? a.purchasePrice ?? Number.MAX_VALUE;
						const pb = b.listingPrice ?? b.purchasePrice ?? Number.MAX_VALUE;
						return pa - pb;
					}
					case "status":
						return (a.status ?? "").localeCompare(b.status ?? "");
					case "label":
					default:
						return (a.unitLabel ?? a.name).localeCompare(b.unitLabel ?? b.name);
				}
			});
			return list;
		}, [units, query, sort]);

		const popoutHeight = Math.min(480, Math.max(coords.cardHeight + 80, 320));

		const style: React.CSSProperties =
			coords.placement === "below"
				? {
						position: "fixed",
						top: coords.top + coords.cardHeight + 8,
						left: coords.left,
						width: 360,
						maxHeight: popoutHeight,
					}
				: {
						// "right" or "left" — both are top-aligned with the card.
						position: "fixed",
						top: coords.top,
						left: coords.left,
						width: 360,
						maxHeight: popoutHeight,
					};

		return createPortal(
			<div
				ref={ref}
				style={style}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				className="z-50 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
				role="dialog"
				aria-label={`${estate.name} units`}
			>
				<header className="flex items-start justify-between gap-2 p-3 border-b border-border">
					<div className="min-w-0">
						<div className="text-badge uppercase tracking-wide font-semibold text-outline">
							{estate.containerKind
								? KIND_LABELS[estate.containerKind]
								: "Container"}
						</div>
						<div className="font-headline font-bold text-on-surface text-sm truncate">
							{estate.name}
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="p-1 rounded-md hover:bg-surface-container-high text-outline"
					>
						<X className="w-4 h-4" />
					</button>
				</header>

				<div className="p-3 border-b border-border space-y-2">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={`Search ${units.length} units…`}
							className="w-full pl-8 pr-2 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
					<div className="flex items-center gap-1">
						{(["label", "price", "status"] as const).map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setSort(s)}
								className={cn(
									"text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md transition-colors",
									sort === s
										? "bg-blue-600 text-white"
										: "text-outline hover:bg-surface-container-high",
								)}
							>
								{s}
							</button>
						))}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					{loading && units.length === 0 ? (
						<div className="p-4 space-y-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="h-12 rounded-md bg-surface-container-high animate-pulse"
								/>
							))}
						</div>
					) : filteredUnits.length === 0 ? (
						<div className="p-6 text-center text-sm text-outline">
							{units.length === 0
								? "No units yet."
								: "No units match your search."}
						</div>
					) : (
						<ul className="divide-y divide-border">
							{filteredUnits.map((u) => (
								<li key={u.id}>
									<Link
										href={`/portfolio/properties/${u.id}`}
										className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-surface-container-high transition-colors"
									>
										<div className="min-w-0">
											<div className="text-sm font-semibold text-on-surface truncate">
												{u.unitLabel || u.name}
											</div>
											{(u.listingPrice ?? u.purchasePrice) != null && (
												<div className="text-[11px] text-outline">
													{formatCurrency(
														(u.listingPrice ?? u.purchasePrice)!,
														u.country,
														u.currency,
													)}
												</div>
											)}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											{typeof u.structure?.completionPercent === "number" &&
												u.structure.completionPercent < 100 && (
													<span className="text-badge text-outline">
														{Math.round(u.structure.completionPercent)}%
													</span>
												)}
											{u.structure?.completionPercent === 100 && (
												<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
											)}
											<span
												className={cn(
													"text-[9px] uppercase tracking-wide font-semibold px-1 py-px rounded-sm whitespace-nowrap",
													STATUS_BADGE[u.status] ??
														"bg-surface-container-high text-on-surface",
												)}
											>
												{STATUS_LABELS[u.status] ?? u.status}
											</span>
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>

				<footer className="border-t border-border p-2 flex items-center gap-1">
					<Link
						href={`/portfolio/properties/${estate.id}`}
						className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-high px-2 py-1.5 rounded-md transition-colors"
					>
						View all
					</Link>
					<Link
						href={`/portfolio/properties/new?parentId=${estate.id}`}
						className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-high px-2 py-1.5 rounded-md transition-colors"
					>
						<Plus className="w-3.5 h-3.5" />
						Add
					</Link>
					<Link
						href={`/portfolio/properties/${estate.id}?bulk=1`}
						className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-high px-2 py-1.5 rounded-md transition-colors"
					>
						<Rows3 className="w-3.5 h-3.5" />
						Bulk
					</Link>
				</footer>
			</div>,
			document.body,
		);
	},
);
