import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: ["/", "/marketplace"],
				disallow: [
					"/portfolio/",
					"/settings",
					"/admin",
					"/api/",
					"/marketplace/favourites",
					"/profile/",
				],
			},
		],
		host: "https://plotfolio.app",
		sitemap: "https://plotfolio.app/sitemap.xml",
	};
}
