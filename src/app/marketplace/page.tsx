import connectDB from "@/lib/mongoose";
import {
    dehydrate,
    makeServerQueryClient,
    prefetchMarketplaceListings,
} from "@/lib/serverQueryClient";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import MarketplaceClient from "./MarketplaceClient";

export const metadata: Metadata = {
	title: "Marketplace · Plotfolio",
	description:
		"Browse properties for sale, rent, and lease worldwide on Plotfolio.",
	openGraph: {
		title: "Marketplace · Plotfolio",
		description:
			"Browse properties for sale, rent, and lease worldwide on Plotfolio.",
		type: "website",
	},
};

/**
 * Server entry for `/marketplace`. Prefetches the for-sale/for-rent/
 * for-lease listings (with activeSale enrichment) on the server and hands
 * the dehydrated cache to the client tree, so `useMarketplaceListings`
 * resolves synchronously on first paint.
 */
export default async function MarketplacePage() {
	const queryClient = makeServerQueryClient();
	try {
		await connectDB();
		await prefetchMarketplaceListings(queryClient);
	} catch (err) {
		console.error("Marketplace prefetch failed:", err);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<MarketplaceClient />
		</HydrationBoundary>
	);
}
