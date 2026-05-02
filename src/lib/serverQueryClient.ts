import { queryKeys } from "@/hooks/usePropertyQueries";
import { PropertyService } from "@/models/Property";
import { BidModel, SaleModel } from "@/models/Sale";
import type { Property } from "@/types/property";
import { SaleStatus } from "@/types/sale";
import { dehydrate, QueryClient } from "@tanstack/react-query";

const TERMINAL_SALE_STATUSES: string[] = [
	SaleStatus.COMPLETED,
	SaleStatus.CANCELLED,
];

const MARKETPLACE_STATUSES = ["for_sale", "for_rent", "for_lease"];

/**
 * Build a fresh QueryClient for a single server render. Never share across
 * requests — a per-request client prevents data leaking between users.
 */
export function makeServerQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Treat server-fetched data as fresh enough to satisfy the first
				// client render. The client's QueryProvider applies its own
				// staleTime once it takes over.
				staleTime: 30 * 1000,
			},
		},
	});
}

/**
 * Prefetch a property detail into the given QueryClient using the same
 * queryKey as `useProperty` on the client. The client `useQuery` will pick
 * up the dehydrated cache entry without making an extra HTTP round-trip.
 */
export async function prefetchProperty(
	queryClient: QueryClient,
	id: string,
): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.properties.detail(id),
		queryFn: async () => {
			const property = await PropertyService.getPropertyById(id);
			// React Query treats `undefined` as "no data" and won't cache it.
			// Return `null` for not-found, matching `PropertyAPI.getProperty`.
			return property ?? null;
		},
	});
}

/**
 * Mirror of the marketplace branch in `GET /api/properties` — fetches all
 * for-sale/for-rent/for-lease listings and enriches each with its active
 * (non-terminal) sale plus auction bid stats. Kept in sync with the API
 * route so server prefetch and client refetch produce identical shapes.
 */
async function loadMarketplaceListings(): Promise<Property[]> {
	const all = await PropertyService.getAllProperties();
	const filtered = all.filter((p) => MARKETPLACE_STATUSES.includes(p.status));
	if (filtered.length === 0) return filtered;

	const ids = filtered.map((p) => p.id);
	const sales = await SaleModel.find({
		propertyId: { $in: ids },
		status: { $nin: TERMINAL_SALE_STATUSES },
	})
		.sort({ createdAt: -1 })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.lean<any[]>();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const byProperty = new Map<string, any>();
	for (const s of sales) {
		if (!byProperty.has(s.propertyId)) {
			const { _id, __v, ...rest } = s;
			byProperty.set(s.propertyId, rest);
		}
	}

	const auctionSaleIds = Array.from(byProperty.values())
		.filter((s) => s.type === "auction")
		.map((s) => s.id);

	let bidStats: Record<
		string,
		{ count: number; topAmount?: number; topBidderName?: string }
	> = {};
	if (auctionSaleIds.length > 0) {
		const bids = await BidModel.find({
			saleId: { $in: auctionSaleIds },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}).lean<any[]>();
		bidStats = bids.reduce(
			(acc, b) => {
				const cur = acc[b.saleId] ?? { count: 0 };
				cur.count += 1;
				if (cur.topAmount == null || b.amount > cur.topAmount) {
					cur.topAmount = b.amount;
					cur.topBidderName = b.bidderName;
				}
				acc[b.saleId] = cur;
				return acc;
			},
			{} as typeof bidStats,
		);
	}

	return filtered.map((p) => {
		const sale = byProperty.get(p.id);
		if (!sale) return p;
		const stats = bidStats[sale.id];
		return {
			...p,
			activeSale: stats ? { ...sale, bidStats: stats } : sale,
		};
	});
}

/**
 * Prefetch the marketplace listings (status filter + activeSale enrichment)
 * into the given QueryClient using the same queryKey as
 * `useMarketplaceListings`.
 */
export async function prefetchMarketplaceListings(
	queryClient: QueryClient,
): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.properties.marketplace,
		queryFn: loadMarketplaceListings,
	});
}

export { dehydrate };
