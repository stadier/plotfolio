import connectDB from "@/lib/mongoose";
import {
    dehydrate,
    makeServerQueryClient,
    prefetchProperty,
} from "@/lib/serverQueryClient";
import { getPropertyImageUrls } from "@/lib/utils";
import { PropertyModel, PropertyService } from "@/models/Property";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import ShortCodeClient from "./ShortCodeClient";

/**
 * Resolve a shortCode to a property id without fetching the full record.
 * Returns `null` when no property matches.
 */
async function resolveShortCode(code: string): Promise<string | null> {
	const trimmed = code.trim().toLowerCase();
	if (!trimmed || trimmed.length < 6) return null;
	await connectDB();
	const property = await PropertyModel.findOne({ shortCode: trimmed })
		.select("id")
		.lean<{ id: string } | null>();
	return property?.id ?? null;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ code: string }>;
}): Promise<Metadata> {
	const { code } = await params;
	try {
		const id = await resolveShortCode(code);
		if (!id) return { title: "Listing not found · Plotfolio" };
		const property = await PropertyService.getPropertyById(id);
		if (!property) return { title: "Listing not found · Plotfolio" };
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
 * Server entry for the `/[code]` short-code listing route. Resolves the
 * shortCode to a property id, prefetches the property into a per-request
 * QueryClient, and hands the dehydrated cache to the client tree.
 */
export default async function ShortCodePropertyPage({
	params,
}: {
	params: Promise<{ code: string }>;
}) {
	const { code } = await params;

	const queryClient = makeServerQueryClient();
	let propertyId: string | null = null;
	let resolveError: string | null = null;

	try {
		propertyId = await resolveShortCode(code);
		if (!propertyId) {
			resolveError = "Property not found";
		} else {
			await prefetchProperty(queryClient, propertyId);
		}
	} catch (err) {
		console.error("Short code prefetch failed:", err);
		// Leave both null so the client falls back to its own resolve.
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<ShortCodeClient
				code={code}
				initialPropertyId={propertyId}
				initialError={resolveError}
			/>
		</HydrationBoundary>
	);
}
