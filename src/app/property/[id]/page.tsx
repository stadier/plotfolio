import connectDB from "@/lib/mongoose";
import {
	dehydrate,
	makeServerQueryClient,
	prefetchProperty,
} from "@/lib/serverQueryClient";
import { getPropertyImageUrls } from "@/lib/utils";
import { PropertyService } from "@/models/Property";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import PropertyDetailClient from "./PropertyDetailClient";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	try {
		await connectDB();
		const property = await PropertyService.getPropertyById(id);
		if (!property) {
			return { title: "Listing not found · Plotfolio" };
		}
		const title = `${property.name} · Plotfolio`;
		const description =
			property.description?.slice(0, 200) ||
			`${property.propertyType.replace(/_/g, " ")} in ${property.city || property.country || "—"}`;
		const images = getPropertyImageUrls(property);
		return {
			title,
			description,
			openGraph: {
				title,
				description,
				images: images.length ? images.slice(0, 1) : undefined,
				type: "website",
			},
			twitter: {
				card: images.length ? "summary_large_image" : "summary",
				title,
				description,
				images: images.length ? images.slice(0, 1) : undefined,
			},
		};
	} catch {
		return { title: "Plotfolio" };
	}
}

/**
 * Server entry for `/property/[id]`. Prefetches the property on the server
 * via `PropertyService` (no internal HTTP) and hands the dehydrated cache
 * to the client tree, so the matching `useProperty(id)` call resolves
 * synchronously on first render — no loading flash, indexable HTML.
 */
export default async function PublicPropertyPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const queryClient = makeServerQueryClient();
	try {
		await connectDB();
		await prefetchProperty(queryClient, id);
	} catch (err) {
		// If prefetch fails (DB hiccup), fall back to client-side fetch — the
		// client `useQuery` will run normally because no cache entry exists.
		console.error("Property prefetch failed:", err);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PropertyDetailClient id={id} />
		</HydrationBoundary>
	);
}
