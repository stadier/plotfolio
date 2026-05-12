import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const base = "https://plotfolio.app";
	const now = new Date();
	return [
		{ url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
		{ url: `${base}/marketplace`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
	];
}
