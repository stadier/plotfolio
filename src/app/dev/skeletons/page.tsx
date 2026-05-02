"use client";

import AppShell from "@/components/layout/AppShell";
import {
	AnalyticsPageSkeleton,
	AvatarSkeleton,
	ChartSkeleton,
	ChatListSkeleton,
	ChatMessagesSkeleton,
	CreatePropertyFormSkeleton,
	DashboardSkeleton,
	DocumentCardSkeleton,
	DocumentsPageSkeleton,
	FormSectionCardSkeleton,
	FormSkeleton,
	ImageSkeleton,
	MapPageSkeleton,
	MapSkeleton,
	MarketplaceCardSkeleton,
	MarketplacePageSkeleton,
	MetricCardSkeleton,
	MetricGridSkeleton,
	PageHeaderRowSkeleton,
	PageHeadingSkeleton,
	PortfolioSwitcherSkeleton,
	ProfileHeaderSkeleton,
	PropertiesPageSkeleton,
	PropertyCardSkeleton,
	PropertyDetailSkeleton,
	PropertyGridSkeleton,
	PropertyListItemSkeleton,
	SummaryStatPillSkeleton,
	SummaryStatRowSkeleton,
	TableRowsSkeleton,
	ToolbarSkeleton,
	UploadZonesSkeleton,
	WidgetCardSkeleton,
} from "@/components/ui/skeletons";

/**
 * Dev-only gallery for every skeleton in the system. Navigate to
 * `/dev/skeletons` to verify the look of each placeholder side-by-side.
 */
export default function SkeletonGalleryPage() {
	return (
		<AppShell>
			<div className="p-6 space-y-12 max-w-[1600px]">
				<header className="space-y-2">
					<h1 className="font-headline text-2xl font-bold text-on-surface">
						Skeleton Gallery
					</h1>
					<p className="text-sm text-on-surface-variant">
						Dev-only page rendering every skeleton component for visual
						verification.
					</p>
				</header>

				<Section title="Primitives">
					<div className="flex items-center gap-6 flex-wrap">
						<Labeled name="AvatarSkeleton">
							<AvatarSkeleton />
						</Labeled>
						<Labeled name="ImageSkeleton">
							<div className="w-40 h-28">
								<ImageSkeleton />
							</div>
						</Labeled>
						<Labeled name="PortfolioSwitcherSkeleton">
							<div className="w-56">
								<PortfolioSwitcherSkeleton />
							</div>
						</Labeled>
						<Labeled name="PortfolioSwitcherSkeleton (collapsed)">
							<div className="w-12">
								<PortfolioSwitcherSkeleton collapsed />
							</div>
						</Labeled>
					</div>
				</Section>

				<Section title="Stat pills & headings">
					<Labeled name="SummaryStatPillSkeleton">
						<SummaryStatPillSkeleton />
					</Labeled>
					<Labeled name="SummaryStatRowSkeleton">
						<SummaryStatRowSkeleton count={4} />
					</Labeled>
					<Labeled name="PageHeadingSkeleton">
						<PageHeadingSkeleton />
					</Labeled>
					<Labeled name="PageHeaderRowSkeleton">
						<PageHeaderRowSkeleton statCount={4} />
					</Labeled>
					<Labeled name="ToolbarSkeleton">
						<ToolbarSkeleton filterCount={3} withActions />
					</Labeled>
				</Section>

				<Section title="Metrics & widgets">
					<Labeled name="MetricCardSkeleton">
						<MetricCardSkeleton />
					</Labeled>
					<Labeled name="MetricGridSkeleton">
						<MetricGridSkeleton count={4} />
					</Labeled>
					<Labeled name="WidgetCardSkeleton">
						<WidgetCardSkeleton />
					</Labeled>
					<Labeled name="ChartSkeleton">
						<ChartSkeleton />
					</Labeled>
				</Section>

				<Section title="Cards">
					<Labeled name="PropertyCardSkeleton">
						<PropertyCardSkeleton />
					</Labeled>
					<Labeled name="PropertyListItemSkeleton">
						<PropertyListItemSkeleton />
					</Labeled>
					<Labeled name="DocumentCardSkeleton">
						<DocumentCardSkeleton />
					</Labeled>
					<Labeled name="MarketplaceCardSkeleton">
						<MarketplaceCardSkeleton />
					</Labeled>
				</Section>

				<Section title="Lists & tables">
					<Labeled name="PropertyGridSkeleton">
						<PropertyGridSkeleton count={6} />
					</Labeled>
					<Labeled name="TableRowsSkeleton">
						<TableRowsSkeleton rows={4} columns={4} />
					</Labeled>
					<Labeled name="ChatListSkeleton">
						<div className="max-w-sm">
							<ChatListSkeleton count={4} />
						</div>
					</Labeled>
					<Labeled name="ChatMessagesSkeleton">
						<ChatMessagesSkeleton />
					</Labeled>
				</Section>

				<Section title="Form pieces">
					<Labeled name="UploadZonesSkeleton">
						<UploadZonesSkeleton />
					</Labeled>
					<Labeled name="FormSectionCardSkeleton (single col)">
						<div className="max-w-sm">
							<FormSectionCardSkeleton rows={3} />
						</div>
					</Labeled>
					<Labeled name="FormSectionCardSkeleton (two col)">
						<div className="max-w-md">
							<FormSectionCardSkeleton rows={3} twoCol />
						</div>
					</Labeled>
					<Labeled name="FormSkeleton">
						<FormSkeleton rows={4} />
					</Labeled>
					<Labeled name="ProfileHeaderSkeleton">
						<ProfileHeaderSkeleton />
					</Labeled>
				</Section>

				<Section title="Map">
					<Labeled name="MapSkeleton">
						<div className="h-64">
							<MapSkeleton />
						</div>
					</Labeled>
				</Section>

				<Section title="Page-level layouts">
					<Labeled name="DashboardSkeleton">
						<Frame>
							<DashboardSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="PropertiesPageSkeleton">
						<Frame>
							<PropertiesPageSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="DocumentsPageSkeleton">
						<Frame>
							<DocumentsPageSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="AnalyticsPageSkeleton">
						<Frame>
							<AnalyticsPageSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="MarketplacePageSkeleton">
						<Frame>
							<MarketplacePageSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="MapPageSkeleton">
						<Frame height="h-[480px]">
							<MapPageSkeleton />
						</Frame>
					</Labeled>
					<Labeled name="PropertyDetailSkeleton">
						<Frame>
							<div className="p-6">
								<PropertyDetailSkeleton />
							</div>
						</Frame>
					</Labeled>
					<Labeled name="CreatePropertyFormSkeleton">
						<Frame height="h-[640px]">
							<CreatePropertyFormSkeleton />
						</Frame>
					</Labeled>
				</Section>
			</div>
		</AppShell>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<h2 className="font-headline text-lg font-bold text-on-surface border-b border-border pb-2">
				{title}
			</h2>
			<div className="space-y-6">{children}</div>
		</section>
	);
}

function Labeled({
	name,
	children,
}: {
	name: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			<p className="text-xs uppercase tracking-wider font-mono text-outline">
				{name}
			</p>
			{children}
		</div>
	);
}

function Frame({
	children,
	height,
}: {
	children: React.ReactNode;
	height?: string;
}) {
	return (
		<div
			className={`border border-border rounded-xl overflow-hidden bg-background ${
				height ?? ""
			}`}
		>
			{children}
		</div>
	);
}
