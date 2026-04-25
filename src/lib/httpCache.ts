export const CacheControl = {
	privateShort: "private, max-age=60, stale-while-revalidate=300",
	privateMedium: "private, max-age=300, stale-while-revalidate=900",
	privateLong: "private, max-age=86400, stale-while-revalidate=604800",
	publicMedium: "public, s-maxage=300, stale-while-revalidate=1800",
} as const;
