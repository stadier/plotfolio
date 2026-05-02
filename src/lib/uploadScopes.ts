import { B2_BUCKET } from "@/lib/b2";

/**
 * Upload "scopes" tell the presign endpoint how to validate a request and
 * where to store the file. Each scope has its own size cap, mime allow-list,
 * and key prefix builder.
 *
 * Scopes are intentionally narrow so a presigned URL for a profile photo can
 * never be reused to overwrite a property document.
 */
export type UploadScope =
	| "property-media"
	| "property-thumb"
	| "property-document"
	| "user-document"
	| "avatar"
	| "portfolio-avatar";

export const PUBLIC_BUCKET_BASE = `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com`;

export interface ScopeConfig {
	maxBytes: number;
	allowedMime: ReadonlyArray<string> | "image/*" | "any";
	/**
	 * Builds the storage key. Inputs come from the request body; the endpoint
	 * sanitises filename before calling.
	 */
	buildKey: (input: {
		userId: string;
		safeName: string;
		ts: number;
		propertyId?: string;
		portfolioId?: string;
	}) => string;
	requirePropertyId?: boolean;
	requirePortfolioId?: boolean;
}

const MB = 1024 * 1024;

export const SCOPE_CONFIG: Record<UploadScope, ScopeConfig> = {
	"property-media": {
		// Photos and videos for property listings
		maxBytes: 200 * MB,
		allowedMime: "any",
		requirePropertyId: true,
		buildKey: ({ propertyId, ts, safeName }) =>
			`uploads/${propertyId}/media/${ts}_${safeName}`,
	},
	"property-thumb": {
		maxBytes: 5 * MB,
		allowedMime: "image/*",
		requirePropertyId: true,
		buildKey: ({ propertyId, ts, safeName }) =>
			`uploads/${propertyId}/media/${ts}_thumb_${safeName}`,
	},
	"property-document": {
		maxBytes: 100 * MB,
		allowedMime: "any",
		requirePropertyId: true,
		buildKey: ({ propertyId, ts, safeName }) =>
			`uploads/${propertyId}/documents/${ts}_${safeName}`,
	},
	"user-document": {
		// Documents not tied to a property (uploaded from /portfolio/documents)
		maxBytes: 100 * MB,
		allowedMime: "any",
		buildKey: ({ userId, ts, safeName }) =>
			`uploads/users/${userId}/documents/${ts}_${safeName}`,
	},
	avatar: {
		maxBytes: 5 * MB,
		allowedMime: ["image/jpeg", "image/png", "image/webp"],
		buildKey: ({ userId, ts, safeName }) =>
			`avatars/${userId}/${ts}_${safeName}`,
	},
	"portfolio-avatar": {
		maxBytes: 5 * MB,
		allowedMime: ["image/jpeg", "image/png", "image/webp"],
		requirePortfolioId: true,
		buildKey: ({ portfolioId, ts, safeName }) =>
			`portfolio-avatars/${portfolioId}/${ts}_${safeName}`,
	},
};

/** Strip path traversal characters and clamp length. */
export function sanitizeFilename(raw: string): string {
	const cleaned = raw.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 200);
	return cleaned.length > 0 ? cleaned : "file";
}

/** Build the public URL for a stored object. Bucket is public-read on B2. */
export function publicUrlForKey(key: string): string {
	return `${PUBLIC_BUCKET_BASE}/${key}`;
}

/** Returns true when the mime is allowed by the scope config. */
export function isMimeAllowed(scope: UploadScope, mime: string): boolean {
	const cfg = SCOPE_CONFIG[scope];
	if (cfg.allowedMime === "any") return true;
	if (cfg.allowedMime === "image/*") return mime.startsWith("image/");
	return cfg.allowedMime.includes(mime);
}
