import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
 * Domain skeletons
 *
 * These compose the <Skeleton> primitive into shapes that mirror the actual
 * components they replace during loading. All sizes are capped via max-width
 * and stay top/left-aligned per the project layout rules.
 *
 * IMPORTANT: Loading routes do NOT show skeletons for the sidebar/header.
 * `loading.tsx` files wrap their skeleton tree with <AppShell> so the
 * navigation chrome stays in place — only the page body shimmers.
 * ────────────────────────────────────────────────────────────────────────── */

/** Avatar circle (default 40px). */
export function AvatarSkeleton({
	size = 40,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<Skeleton
			shape="circle"
			style={{ width: size, height: size }}
			className={cn("shrink-0", className)}
		/>
	);
}

/** Image placeholder — for hero/card images that are still loading. */
export function ImageSkeleton({ className }: { className?: string }) {
	return <Skeleton shape="card" className={cn("w-full h-full", className)} />;
}

/**
 * Pill-shaped stat card matching `SummaryStatCard` (default variant) — icon
 * circle on the left + label/value stacked on the right. Max-w-xs, no stretch.
 */
export function SummaryStatPillSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-lg px-5 py-3 flex items-center gap-3 max-w-xs w-full",
				className,
			)}
		>
			<Skeleton shape="circle" className="w-10 h-10 shrink-0" />
			<div className="flex-1 min-w-0 space-y-1.5">
				<SkeletonText width="w-20" className="h-2.5" />
				<SkeletonText width="w-16" className="h-3.5" />
			</div>
		</div>
	);
}

/** Row of summary stat pills (used on properties / documents / analytics). */
export function SummaryStatRowSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="flex flex-wrap items-stretch gap-3">
			{Array.from({ length: count }).map((_, i) => (
				<SummaryStatPillSkeleton key={i} />
			))}
		</div>
	);
}

/** Page heading + description (left) paired with stat pills (right). */
export function PageHeaderRowSkeleton({
	statCount = 4,
}: {
	statCount?: number;
}) {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
			<div className="space-y-2 max-w-xl">
				<Skeleton className="h-6 w-48" />
				<SkeletonText width="w-72" />
			</div>
			<SummaryStatRowSkeleton count={statCount} />
		</div>
	);
}

/** Search bar + filter selects + view-mode toggle (used on list pages). */
export function ToolbarSkeleton({
	filterCount = 3,
	withActions = false,
}: {
	filterCount?: number;
	withActions?: boolean;
}) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<Skeleton className="h-9 w-64" />
			{Array.from({ length: filterCount }).map((_, i) => (
				<Skeleton key={i} className="h-9 w-32" />
			))}
			<div className="ml-auto flex items-center gap-2">
				{withActions && (
					<>
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-24" />
					</>
				)}
				<Skeleton className="h-9 w-9" />
				<Skeleton className="h-9 w-9" />
			</div>
		</div>
	);
}

/** Card-style metric (legacy — used inside dashboards). */
export function MetricCardSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl p-5 max-w-xs w-full",
				className,
			)}
		>
			<SkeletonText width="w-24" className="mb-3" />
			<Skeleton className="h-7 w-32 mb-2" />
			<SkeletonText width="w-20" />
		</div>
	);
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{Array.from({ length: count }).map((_, i) => (
				<MetricCardSkeleton key={i} />
			))}
		</div>
	);
}

/** Generic widget card with header + body of given height. */
export function WidgetCardSkeleton({
	height = 200,
	className,
}: {
	height?: number;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl p-5 space-y-3",
				className,
			)}
		>
			<div className="flex items-center justify-between">
				<SkeletonText width="w-32" className="h-4" />
				<SkeletonText width="w-12" />
			</div>
			<Skeleton shape="card" style={{ height }} className="w-full" />
		</div>
	);
}

/** Chart card (header + chart area). */
export function ChartSkeleton({
	height = 280,
	className,
}: {
	height?: number;
	className?: string;
}) {
	return (
		<div
			className={cn("bg-card border border-border rounded-xl p-5", className)}
		>
			<div className="flex items-center justify-between mb-4">
				<div className="space-y-2">
					<SkeletonText width="w-40" className="h-4" />
					<SkeletonText width="w-32" />
				</div>
				<Skeleton shape="pill" className="h-5 w-12" />
			</div>
			<Skeleton shape="card" style={{ height }} className="w-full" />
		</div>
	);
}

/** Property card skeleton — matches PropertyCard layout (image + meta + grid). */
export function PropertyCardSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full",
				className,
			)}
		>
			<Skeleton shape="card" className="w-full aspect-4/3 rounded-none" />
			<div className="p-4 space-y-3">
				<SkeletonText width="w-3/4" className="h-4" />
				<SkeletonText width="w-1/2" />
				<div className="flex items-center gap-2 pt-1">
					<Skeleton shape="pill" className="h-5 w-16" />
					<Skeleton shape="pill" className="h-5 w-20" />
				</div>
				<div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
					<div className="space-y-1.5">
						<SkeletonText width="w-16" className="h-2.5" />
						<SkeletonText width="w-12" />
					</div>
					<div className="space-y-1.5">
						<SkeletonText width="w-16" className="h-2.5" />
						<SkeletonText width="w-12" />
					</div>
				</div>
			</div>
		</div>
	);
}

/** Compact list-item skeleton (rows in tables / lists). */
export function PropertyListItemSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl p-4 flex items-center gap-3",
				className,
			)}
		>
			<Skeleton shape="card" className="h-14 w-14 shrink-0" />
			<div className="flex-1 min-w-0 space-y-2">
				<SkeletonText width="w-1/2" className="h-4" />
				<SkeletonText width="w-1/3" />
			</div>
			<Skeleton shape="pill" className="h-5 w-16" />
		</div>
	);
}

/** Grid of property cards. */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{Array.from({ length: count }).map((_, i) => (
				<PropertyCardSkeleton key={i} />
			))}
		</div>
	);
}

/** Full property detail layout (hero + sidebar + content). */
export function PropertyDetailSkeleton() {
	return (
		<div className="space-y-6 max-w-6xl">
			<Skeleton shape="card" className="w-full aspect-video max-h-[420px]" />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-4">
					<SkeletonText width="w-1/2" className="h-6" />
					<SkeletonText width="w-1/3" />
					<div className="bg-card border border-border rounded-xl p-5 space-y-3">
						<SkeletonText />
						<SkeletonText />
						<SkeletonText width="w-2/3" />
					</div>
					<div className="bg-card border border-border rounded-xl p-5 space-y-3">
						<SkeletonText width="w-32" className="h-4" />
						<div className="grid grid-cols-2 gap-3">
							<SkeletonText />
							<SkeletonText />
							<SkeletonText />
							<SkeletonText />
						</div>
					</div>
				</div>
				<aside className="space-y-4">
					<MetricCardSkeleton className="max-w-none" />
					<div className="bg-card border border-border rounded-xl p-5 space-y-3">
						<SkeletonText width="w-24" className="h-4" />
						<SkeletonText />
						<SkeletonText width="w-2/3" />
					</div>
				</aside>
			</div>
		</div>
	);
}

/**
 * Document card skeleton — matches the document grid card on
 * `/portfolio/documents` (preview area with mock lines + footer).
 */
export function DocumentCardSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl overflow-hidden max-w-xs w-full",
				className,
			)}
		>
			<div className="bg-surface-container-low p-5 space-y-2.5">
				<SkeletonText className="h-2" />
				<SkeletonText className="h-2" width="w-11/12" />
				<SkeletonText className="h-2" width="w-3/4" />
				<SkeletonText className="h-2" width="w-5/6" />
			</div>
			<div className="p-4 space-y-2">
				<Skeleton shape="pill" className="h-5 w-12" />
				<SkeletonText width="w-3/4" className="h-3.5" />
				<SkeletonText width="w-1/2" />
				<Skeleton shape="pill" className="h-4 w-20" />
			</div>
		</div>
	);
}

/** Marketplace listing card. */
export function MarketplaceCardSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"bg-card border border-border rounded-xl overflow-hidden max-w-sm w-full",
				className,
			)}
		>
			<Skeleton shape="card" className="w-full aspect-4/3 rounded-none" />
			<div className="p-4 space-y-2">
				<SkeletonText width="w-2/3" className="h-4" />
				<SkeletonText width="w-1/3" />
				<div className="flex items-center justify-between pt-2">
					<SkeletonText width="w-20" className="h-4" />
					<Skeleton shape="pill" className="h-5 w-16" />
				</div>
			</div>
		</div>
	);
}

/** Profile header skeleton (cover + avatar + bio lines). */
export function ProfileHeaderSkeleton() {
	return (
		<div className="bg-card border border-border rounded-xl overflow-hidden max-w-4xl">
			<Skeleton shape="card" className="w-full h-32 rounded-none" />
			<div className="px-5 pb-5">
				<div className="-mt-10 mb-4">
					<AvatarSkeleton size={80} />
				</div>
				<SkeletonText width="w-48" className="h-5 mb-2" />
				<SkeletonText width="w-32" className="mb-3" />
				<SkeletonText />
				<SkeletonText width="w-3/4" className="mt-2" />
			</div>
		</div>
	);
}

/** Chat list (sidebar) skeleton. */
export function ChatListSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
				>
					<AvatarSkeleton size={40} />
					<div className="flex-1 min-w-0 space-y-2">
						<SkeletonText width="w-1/2" className="h-3.5" />
						<SkeletonText width="w-3/4" />
					</div>
				</div>
			))}
		</div>
	);
}

/** Chat messages skeleton. */
export function ChatMessagesSkeleton() {
	return (
		<div className="space-y-3 p-4 max-w-3xl">
			{[
				{ side: "left", w: "w-2/3" },
				{ side: "right", w: "w-1/2" },
				{ side: "left", w: "w-1/3" },
				{ side: "right", w: "w-3/5" },
				{ side: "left", w: "w-1/2" },
			].map((m, i) => (
				<div
					key={i}
					className={cn(
						"flex",
						m.side === "right" ? "justify-end" : "justify-start",
					)}
				>
					<Skeleton className={cn("h-9", m.w, "max-w-md")} />
				</div>
			))}
		</div>
	);
}

/** Generic table-row skeleton (for admin / team / transfers). */
export function TableRowsSkeleton({
	rows = 6,
	columns = 4,
}: {
	rows?: number;
	columns?: number;
}) {
	return (
		<div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
			{Array.from({ length: rows }).map((_, r) => (
				<div
					key={r}
					className="grid gap-3 px-4 py-3"
					style={{
						gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
					}}
				>
					{Array.from({ length: columns }).map((__, c) => (
						<SkeletonText key={c} width={c === 0 ? "w-3/4" : "w-1/2"} />
					))}
				</div>
			))}
		</div>
	);
}

/** Map placeholder (full-area). */
export function MapSkeleton({ className }: { className?: string }) {
	return (
		<Skeleton
			shape="card"
			className={cn("w-full h-full min-h-80 rounded-none", className)}
		/>
	);
}

/** Page heading + subtitle skeleton. */
export function PageHeadingSkeleton() {
	return (
		<div className="space-y-2 max-w-xl">
			<Skeleton className="h-6 w-48" />
			<SkeletonText width="w-72" />
		</div>
	);
}

/** Form placeholder (label + input rows). */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-xl">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="space-y-2">
					<SkeletonText width="w-32" />
					<Skeleton className="h-9 w-full" />
				</div>
			))}
			<Skeleton className="h-9 w-32" />
		</div>
	);
}

/**
 * Portfolio switcher skeleton — matches the picker in the sidebar. Use only
 * when portfolio data is genuinely loading; the rest of the sidebar stays
 * static so we don't shimmer items that are already known.
 */
export function PortfolioSwitcherSkeleton({
	collapsed = false,
}: {
	collapsed?: boolean;
}) {
	return (
		<div className="ml-1 flex items-center gap-2 px-3 py-2 rounded-md w-[calc(100%-7px)] border border-border">
			<Skeleton className="w-6 h-6 shrink-0" />
			{!collapsed && <SkeletonText width="w-24" className="h-3" />}
		</div>
	);
}

/* ── Page-level layouts ────────────────────────────────────────────────── */

/** Dashboard skeleton — mirrors `/portfolio` layout. */
export function DashboardSkeleton() {
	return (
		<div className="p-6 space-y-6">
			<PageHeaderRowSkeleton statCount={5} />
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_350px_350px] gap-4">
				<div className="min-w-0 lg:row-span-2 space-y-4">
					<Skeleton
						shape="card"
						className="w-full aspect-video max-h-[360px]"
					/>
					<WidgetCardSkeleton height={120} />
				</div>
				<div className="space-y-4">
					<WidgetCardSkeleton height={260} />
					<WidgetCardSkeleton height={280} />
				</div>
				<div className="space-y-4">
					<WidgetCardSkeleton height={100} />
					<WidgetCardSkeleton height={220} />
					<WidgetCardSkeleton height={80} />
					<WidgetCardSkeleton height={160} />
				</div>
			</div>
		</div>
	);
}

/** My Properties page skeleton. */
export function PropertiesPageSkeleton() {
	return (
		<div className="p-6 space-y-5">
			<PageHeaderRowSkeleton statCount={4} />
			<ToolbarSkeleton filterCount={3} />
			<PropertyGridSkeleton count={6} />
		</div>
	);
}

/** My Documents page skeleton. */
export function DocumentsPageSkeleton() {
	return (
		<div className="p-6 space-y-5">
			<PageHeaderRowSkeleton statCount={4} />
			<ToolbarSkeleton filterCount={3} withActions />
			<div className="flex flex-wrap gap-5">
				{Array.from({ length: 8 }).map((_, i) => (
					<DocumentCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

/** Analytics page skeleton — top stats + 3-up + wide + 3-up. */
export function AnalyticsPageSkeleton() {
	return (
		<div className="p-6 space-y-5">
			<PageHeaderRowSkeleton statCount={4} />
			<div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-4">
				<div className="col-span-4 sm:col-span-6 lg:col-span-6">
					<ChartSkeleton height={220} />
				</div>
				<div className="col-span-4 sm:col-span-3 lg:col-span-3">
					<ChartSkeleton height={220} />
				</div>
				<div className="col-span-4 sm:col-span-3 lg:col-span-3">
					<ChartSkeleton height={220} />
				</div>
				<div className="col-span-4 sm:col-span-6 lg:col-span-12">
					<ChartSkeleton height={240} />
				</div>
				<div className="col-span-4 sm:col-span-3 lg:col-span-4">
					<ChartSkeleton height={220} />
				</div>
				<div className="col-span-4 sm:col-span-3 lg:col-span-4">
					<ChartSkeleton height={220} />
				</div>
				<div className="col-span-4 sm:col-span-6 lg:col-span-4">
					<ChartSkeleton height={220} />
				</div>
			</div>
		</div>
	);
}

/**
 * Map page skeleton — left property list panel + full-area map.
 * Renders inside <AppShell scrollable={false}>.
 */
export function MapPageSkeleton() {
	return (
		<div className="flex h-full w-full">
			<aside className="w-[220px] shrink-0 border-r border-border p-4 space-y-3 overflow-y-auto">
				<SkeletonText width="w-24" className="h-4" />
				<Skeleton className="h-8 w-full" />
				<div className="flex flex-wrap gap-1.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} shape="pill" className="h-6 w-14" />
					))}
				</div>
				<div className="space-y-2 pt-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-center gap-2 p-2">
							<Skeleton className="h-9 w-9 shrink-0" />
							<div className="flex-1 min-w-0 space-y-1.5">
								<SkeletonText width="w-3/4" className="h-3" />
								<SkeletonText width="w-1/2" />
							</div>
						</div>
					))}
				</div>
			</aside>
			<div className="flex-1 min-w-0 relative">
				<MapSkeleton />
			</div>
		</div>
	);
}

/** Marketplace listing grid page. */
export function MarketplacePageSkeleton() {
	return (
		<div className="p-6 space-y-5">
			<PageHeaderRowSkeleton statCount={3} />
			<ToolbarSkeleton filterCount={3} />
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<MarketplaceCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
