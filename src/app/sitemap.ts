import { PropertyService } from "@/models/Property";
import type { MetadataRoute } from "next";

const MARKETPLACE_STATUSES = ["for_sale", "for_rent", "for_lease"];

// Re-generate at most every 30 minutes (matches typical listing churn).
export const revalidate = 1800;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = "https://plotfolio.app";
	const now = new Date();

	const staticEntries: MetadataRoute.Sitemap = [
		{
			url: `${base}/`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${base}/marketplace`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 0.9,
		},
	];

	let listingEntries: MetadataRoute.Sitemap = [];
	try {
		const all = await PropertyService.getAllProperties();
		listingEntries = all
			.filter((p) => MARKETPLACE_STATUSES.includes(p.status))
			.map((p) => ({
				url: `${base}/marketplace/${p.id}`,
				lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
				changeFrequency: "weekly" as const,
				priority: 0.7,
			}));
	} catch (err) {
		console.error("sitemap: failed to load marketplace listings", err);
	}

	return [...staticEntries, ...listingEntries];
}
