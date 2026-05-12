"use client";

import BulkUnitCreator from "@/components/property/BulkUnitCreator";
import MasonryGrid from "@/components/ui/MasonryGrid";
import PrimaryButton from "@/components/ui/PrimaryButton";
import {
	useChildProperties,
	useDeleteProperty,
} from "@/hooks/usePropertyQueries";
import { formatCurrency, getPropertyMedia } from "@/lib/utils";
import {
	MediaType,
	Property,
	PropertyContainerKind,
	PropertyStatus,
} from "@/types/property";
import {
	Building2,
	ChevronLeft,
	ChevronRight,
	Layers,
	LayoutGrid,
	List,
	Plus,
	Rows3,
	Search,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 12;

const CONTAINER_KIND_LABELS: Record<PropertyContainerKind, string> = {
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

interface UnitsPanelProps {
	parent: Property;
	isOwner?: boolean;
	/**
	 * When true, omit the outer card chrome and the title header — useful
	 * when this panel is hosted inside an accordion section that already
	 * provides those.
	 */
	bare?: boolean;
}

/**
 * Lists child properties (units) belonging to a container parent
 * (estate, phase, building, subdivision). Renders nothing when the
 * parent is not flagged as a container.
 */
export default function UnitsPanel({ parent, isOwner, bare }: UnitsPanelProps) {
	const enabled = Boolean(parent.isContainer);
	const { data: units, isLoading } = useChildProperties(
		enabled ? parent.id : null,
	);
	const [bulkOpen, setBulkOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

	const total = units?.length ?? 0;
	const sold =
		units?.filter(
			(u) =>
				u.status === PropertyStatus.UNDER_CONTRACT ||
				u.status === PropertyStatus.RESERVED,
		).length ?? 0;
	const available =
		units?.filter(
			(u) =>
				u.status === PropertyStatus.FOR_SALE ||
				u.status === PropertyStatus.FOR_RENT ||
				u.status === PropertyStatus.FOR_LEASE,
		).length ?? 0;

	// Filter units by search query (case-insensitive across name + label).
	const filtered = useMemo(() => {
		if (!units) return [];
		const q = query.trim().toLowerCase();
		if (!q) return units;
		return units.filter((u) => {
			const haystack = [u.name, u.unitLabel, u.address]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
	}, [units, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageItems = useMemo(
		() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
		[filtered, safePage],
	);

	if (!enabled) return null;

	const kindLabel = parent.containerKind
		? CONTAINER_KIND_LABELS[parent.containerKind]
		: "Container";

	const Wrapper: React.ElementType = bare ? "div" : "section";
	const wrapperClass = bare ? "" : "bg-card rounded-xl p-4 sm:p-5";

	return (
		<Wrapper className={wrapperClass}>
			{!bare && (
				<header className="flex items-start justify-between gap-3 flex-wrap mb-4">
					<div className="flex items-start gap-2 min-w-0">
						<Layers className="w-5 h-5 text-primary mt-0.5 shrink-0" />
						<div className="min-w-0">
							<h2 className="font-headline font-bold text-on-surface text-base">
								{kindLabel} units
							</h2>
							<p className="text-xs text-on-surface-variant">
								{isLoading
									? "Loading units…"
									: `${total} total · ${available} available · ${sold} reserved/sold`}
							</p>
						</div>
					</div>
					{isOwner && (
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setBulkOpen(true)}
								className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
							>
								<Rows3 className="w-4 h-4" />
								Bulk create
							</button>
							<PrimaryButton
								href={`/portfolio/properties/new?parentId=${parent.id}`}
								className="px-3 py-2"
							>
								<Plus className="w-4 h-4" />
								Add unit
							</PrimaryButton>
						</div>
					)}
				</header>
			)}

			{/* In bare mode, action buttons sit inline with the search bar row below. */}

			{/* Search bar with pagination summary (and action buttons in bare mode) */}
			{(!isLoading && total > 0) || (bare && isOwner) ? (
				<div className="mb-3 flex items-center gap-3 flex-wrap">
					{!isLoading && total > 0 && (
						<>
							<div className="relative flex-1 min-w-[200px] max-w-md">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
								<input
									type="search"
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setPage(1);
									}}
									placeholder={`Search ${kindLabel.toLowerCase()} units…`}
									className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
								/>
							</div>
							{filtered.length > 0 && (
								<div className="text-xs text-on-surface-variant">
									Page {safePage} of {totalPages} · {filtered.length} result
									{filtered.length === 1 ? "" : "s"}
								</div>
							)}
							<ViewModeToggle value={viewMode} onChange={setViewMode} />
						</>
					)}
					{bare && isOwner && (
						<div className="ml-auto flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setBulkOpen(true)}
								className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
							>
								<Rows3 className="w-4 h-4" />
								Bulk create
							</button>
							<PrimaryButton
								href={`/portfolio/properties/new?parentId=${parent.id}`}
								className="px-3 py-2"
							>
								<Plus className="w-4 h-4" />
								Add unit
							</PrimaryButton>
						</div>
					)}
				</div>
			) : null}

			{isLoading ? (
				<MasonryGrid minColWidth={220} maxColWidth={280} gap={12}>
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className="h-40 rounded-md bg-surface-container-high animate-pulse"
						/>
					))}
				</MasonryGrid>
			) : total === 0 ? (
				<div className="rounded-md border border-dashed border-border p-6 text-center">
					<Building2 className="w-6 h-6 text-outline mx-auto mb-2" />
					<p className="text-sm text-on-surface-variant">
						No units have been added to this {kindLabel.toLowerCase()} yet.
					</p>
					{isOwner && (
						<p className="text-xs text-outline mt-1">
							Use “Add unit” to create one, or bulk-create from the parent.
						</p>
					)}
				</div>
			) : filtered.length === 0 ? (
				<div className="rounded-md border border-dashed border-border p-6 text-center">
					<Search className="w-6 h-6 text-outline mx-auto mb-2" />
					<p className="text-sm text-on-surface-variant">
						No units match “{query}”.
					</p>
				</div>
			) : (
				<>
					{viewMode === "grid" ? (
						<MasonryGrid minColWidth={220} maxColWidth={280} gap={12}>
							{pageItems.map((unit) => (
								<UnitCard key={unit.id} unit={unit} />
							))}
						</MasonryGrid>
					) : (
						<UnitsTable units={pageItems} isOwner={isOwner} />
					)}

					{totalPages > 1 && (
						<Pagination
							page={safePage}
							totalPages={totalPages}
							onChange={setPage}
						/>
					)}
				</>
			)}

			<BulkUnitCreator
				parent={parent}
				open={bulkOpen}
				onClose={() => setBulkOpen(false)}
			/>
		</Wrapper>
	);
}

/** Resolves the first usable preview image URL for a unit, if any. */
function getUnitImage(unit: Property): string | null {
	// Use getPropertyMedia so B2 URLs are proxied through /api/media/view/
	// (matches MediaGallery and other previews across the app).
	const media = getPropertyMedia(unit);
	const firstImage = media.find(
		(m) => m.type === MediaType.IMAGE && m.status !== "failed" && m.url,
	);
	if (firstImage?.url) return firstImage.url;
	const videoThumb = media.find((m) => m.thumbnail);
	return videoThumb?.thumbnail ?? null;
}

function UnitCard({ unit }: { unit: Property }) {
	const label = unit.unitLabel || unit.name;
	const statusLabel = STATUS_LABELS[unit.status] ?? unit.status;
	const badgeClass =
		STATUS_BADGE[unit.status] ?? "bg-surface-container-high text-on-surface";
	const completion = unit.structure?.completionPercent;
	const price = unit.listingPrice ?? unit.purchasePrice;
	const image = getUnitImage(unit);

	return (
		<Link
			href={`/portfolio/properties/${unit.id}`}
			className="block rounded-md border border-border bg-surface-container hover:bg-surface-container-high transition-colors overflow-hidden"
		>
			{image && (
				<div className="relative w-full aspect-16/10 bg-surface-container-high">
					<Image
						src={image}
						alt={label}
						fill
						sizes="(max-width: 640px) 100vw, 280px"
						className="object-cover"
					/>
					<span
						className={`absolute top-2 right-2 text-badge uppercase tracking-wide font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${badgeClass}`}
					>
						{statusLabel}
					</span>
				</div>
			)}
			<div className="p-3">
				<div className="flex items-start justify-between gap-2 mb-1 min-w-0">
					<div className="min-w-0">
						<div className="font-headline font-bold text-sm text-on-surface truncate">
							{label}
						</div>
						{unit.unitLabel && unit.name !== unit.unitLabel && (
							<div className="text-badge text-outline truncate">
								{unit.name}
							</div>
						)}
					</div>
					{!image && (
						<span
							className={`text-badge uppercase tracking-wide font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${badgeClass}`}
						>
							{statusLabel}
						</span>
					)}
				</div>
				{price != null && (
					<div className="text-xs text-on-surface-variant">
						{formatCurrency(price, unit.country, unit.currency)}
					</div>
				)}
				{typeof completion === "number" && completion < 100 && (
					<div className="mt-2">
						<div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
							<div
								className="h-full bg-primary"
								style={{
									width: `${Math.max(0, Math.min(100, completion))}%`,
								}}
							/>
						</div>
						<div className="text-badge text-outline mt-1">
							{Math.round(completion)}% complete
						</div>
					</div>
				)}
			</div>
		</Link>
	);
}

interface PaginationProps {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}

/**
 * Compact pagination control: prev / page numbers (with ellipsis for
 * long ranges) / next. Always renders the first and last page.
 */
function Pagination({ page, totalPages, onChange }: PaginationProps) {
	const pages = buildPageList(page, totalPages);
	const baseBtn =
		"min-w-[2rem] h-8 px-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center";

	return (
		<nav
			aria-label="Units pagination"
			className="mt-4 flex items-center justify-center gap-1 flex-wrap"
		>
			<button
				type="button"
				onClick={() => onChange(Math.max(1, page - 1))}
				disabled={page <= 1}
				className={`${baseBtn} border border-border text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed`}
				aria-label="Previous page"
			>
				<ChevronLeft className="w-4 h-4" />
			</button>
			{pages.map((p, i) =>
				p === "…" ? (
					<span
						key={`ellipsis-${i}`}
						className={`${baseBtn} text-outline`}
						aria-hidden
					>
						…
					</span>
				) : (
					<button
						key={p}
						type="button"
						onClick={() => onChange(p)}
						aria-current={p === page ? "page" : undefined}
						className={`${baseBtn} border ${
							p === page
								? "border-primary bg-primary text-white"
								: "border-border text-on-surface-variant hover:bg-surface-container-high"
						}`}
					>
						{p}
					</button>
				),
			)}
			<button
				type="button"
				onClick={() => onChange(Math.min(totalPages, page + 1))}
				disabled={page >= totalPages}
				className={`${baseBtn} border border-border text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed`}
				aria-label="Next page"
			>
				<ChevronRight className="w-4 h-4" />
			</button>
		</nav>
	);
}

/** Build a page-number list with ellipses around the current page. */
function buildPageList(current: number, total: number): (number | "…")[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}
	const pages: (number | "…")[] = [1];
	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	if (start > 2) pages.push("…");
	for (let p = start; p <= end; p++) pages.push(p);
	if (end < total - 1) pages.push("…");
	pages.push(total);
	return pages;
}

interface ViewModeToggleProps {
	value: "grid" | "table";
	onChange: (mode: "grid" | "table") => void;
}

/** Compact two-button segmented control to switch between grid and table views. */
function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
	const baseBtn = "flex items-center justify-center w-8 h-8 transition-colors";
	return (
		<div
			className="inline-flex items-center rounded-md border border-border overflow-hidden"
			role="group"
			aria-label="View mode"
		>
			<button
				type="button"
				onClick={() => onChange("grid")}
				aria-pressed={value === "grid"}
				aria-label="Grid view"
				className={`${baseBtn} ${
					value === "grid"
						? "bg-primary text-white"
						: "text-on-surface-variant hover:bg-surface-container-high"
				}`}
			>
				<LayoutGrid className="w-4 h-4" />
			</button>
			<button
				type="button"
				onClick={() => onChange("table")}
				aria-pressed={value === "table"}
				aria-label="Table view"
				className={`${baseBtn} ${
					value === "table"
						? "bg-primary text-white"
						: "text-on-surface-variant hover:bg-surface-container-high"
				}`}
			>
				<List className="w-4 h-4" />
			</button>
		</div>
	);
}

/** Compact table view of units — alternative to the masonry grid. */
function UnitsTable({
	units,
	isOwner,
}: {
	units: Property[];
	isOwner?: boolean;
}) {
	const deleteProperty = useDeleteProperty();
	const handleDelete = (unit: Property) => {
		const label = unit.unitLabel || unit.name;
		if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) {
			return;
		}
		deleteProperty.mutate(unit.id);
	};
	return (
		<div className="overflow-x-auto rounded-md border border-border">
			<table className="w-full text-sm">
				<thead className="bg-surface-container-high text-on-surface-variant">
					<tr className="text-left">
						<th className="px-3 py-2 font-semibold">Unit</th>
						<th className="px-3 py-2 font-semibold">Status</th>
						<th className="px-3 py-2 font-semibold text-right">Price</th>
						{isOwner && (
							<th className="px-3 py-2 font-semibold text-right w-10">
								<span className="sr-only">Delete</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{units.map((unit) => {
						const label = unit.unitLabel || unit.name;
						const statusLabel = STATUS_LABELS[unit.status] ?? unit.status;
						const badgeClass =
							STATUS_BADGE[unit.status] ??
							"bg-surface-container-high text-on-surface";
						const price = unit.listingPrice ?? unit.purchasePrice;
						return (
							<tr
								key={unit.id}
								className="border-t border-border hover:bg-surface-container-high transition-colors"
							>
								<td className="px-3 py-2 min-w-0">
									<Link
										href={`/portfolio/properties/${unit.id}`}
										className="font-headline font-bold text-on-surface hover:text-primary truncate block"
									>
										{label}
									</Link>
									{unit.unitLabel && unit.name !== unit.unitLabel && (
										<div className="text-badge text-outline truncate">
											{unit.name}
										</div>
									)}
								</td>
								<td className="px-3 py-2">
									<span
										className={`inline-block text-badge uppercase tracking-wide font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${badgeClass}`}
									>
										{statusLabel}
									</span>
								</td>
								<td className="px-3 py-2 text-right text-on-surface-variant whitespace-nowrap">
									{price != null
										? formatCurrency(price, unit.country, unit.currency)
										: "—"}
								</td>
								{isOwner && (
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<button
											type="button"
											onClick={() => handleDelete(unit)}
											disabled={
												deleteProperty.isPending &&
												deleteProperty.variables === unit.id
											}
											aria-label="Delete unit"
											title="Delete unit"
											className="inline-flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors disabled:opacity-50"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
