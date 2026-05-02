"use client";

import { getScopedCacheKey } from "@/lib/cacheScope";
import { queryClient } from "@/lib/queryClient";
import type { QueryKey } from "@tanstack/react-query";

/**
 * URL → JSON cache helpers, delegating to the shared TanStack QueryClient.
 *
 * This file used to maintain its OWN memory + localStorage cache, which
 * lived in parallel to the React Query cache. That meant any URL could
 * end up cached in both places, and invalidating one wouldn't refresh
 * the other (e.g. uploading a property image and then opening the
 * drawer would show the property without the new media because
 * `PropertyDrawer` reads from `cachedGetJSON` while the rest of the app
 * uses React Query).
 *
 * Now there is exactly one cache (the singleton QueryClient). The
 * `cachedGetJSON` / `invalidateCachedGet` API is preserved so existing
 * callers don't have to be touched, but internally everything goes
 * through `queryClient.fetchQuery` / `queryClient.invalidateQueries`.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Query-key namespace for URL-based cache entries created via `cachedGetJSON`. */
const URL_QUERY_KEY_PREFIX = "cachedGet" as const;

/**
 * Map URL patterns to the structured React Query key prefixes used by
 * the typed hooks (see `usePropertyQueries.ts`). When `invalidateCachedGet`
 * is called with one of these patterns we invalidate BOTH the URL-keyed
 * entries AND the structured-key entries so both naming schemes stay in
 * sync.
 *
 * `sampleUrl` is a representative URL for the feature area — used to
 * decide whether an arbitrary `match` argument overlaps with this entry
 * by simply testing the sample URL against the match.
 */
const URL_TO_QUERY_KEY: ReadonlyArray<{
	sampleUrl: string;
	queryKey: readonly unknown[];
}> = [
	{ sampleUrl: "/api/properties/x", queryKey: ["properties"] },
	{ sampleUrl: "/api/documents/x", queryKey: ["documents"] },
	{ sampleUrl: "/api/portfolios/x", queryKey: ["portfolios"] },
	{ sampleUrl: "/api/chat/x", queryKey: ["chats"] },
	{ sampleUrl: "/api/bookings/x", queryKey: ["bookings"] },
	{ sampleUrl: "/api/transfers/x", queryKey: ["transfers"] },
	{ sampleUrl: "/api/properties/x/transfers", queryKey: ["transfers"] },
	{ sampleUrl: "/api/subscriptions/x", queryKey: ["subscriptions"] },
];

/**
 * Common URL-pattern regexes. Kept for backward-compatible imports — every
 * existing call site (`invalidateCachedGet(cachePatterns.properties)`)
 * keeps working unchanged.
 */
export const cachePatterns = {
	properties: /\/api\/properties(\/|\?|$)/,
	property: (id: string) =>
		new RegExp(
			`/api/properties/${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|\\?|$)`,
		),
	documents: /\/api\/documents(\/|\?|$)/,
	portfolios: /\/api\/portfolios(\/|\?|$)/,
	chats: /\/api\/chat(\/|\?|$)/,
	bookings: /\/api\/bookings(\/|\?|$)/,
	transfers: /\/api\/(transfers|properties\/[^/?]+\/transfers)(\/|\?|$)/,
};

function urlQueryKey(cacheKey: string): QueryKey {
	return [URL_QUERY_KEY_PREFIX, cacheKey];
}

export function invalidateCachedGet(match?: string | RegExp) {
	// Full reset.
	if (!match) {
		queryClient.clear();
		return;
	}

	const matches = (key: string) =>
		typeof match === "string" ? key.includes(match) : match.test(key);

	// 1. Invalidate URL-keyed entries written by `cachedGetJSON`.
	queryClient.invalidateQueries({
		predicate: (query) => {
			const k = query.queryKey;
			return (
				Array.isArray(k) &&
				k[0] === URL_QUERY_KEY_PREFIX &&
				typeof k[1] === "string" &&
				matches(k[1] as string)
			);
		},
	});

	// 2. Also invalidate any structured query keys whose feature area is
	// covered by the URL pattern. e.g. invalidating `/api/properties` should
	// also clear the `["properties", "detail", id]` entries used by hooks.
	const seen = new Set<string>();
	for (const { sampleUrl, queryKey } of URL_TO_QUERY_KEY) {
		const key = JSON.stringify(queryKey);
		if (seen.has(key)) continue;
		if (matches(sampleUrl)) {
			seen.add(key);
			queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
		}
	}
}

export async function cachedGetJSON<T>(
	url: string,
	options?: {
		ttlMs?: number;
		cacheKey?: string;
		force?: boolean;
		fetchInit?: Omit<RequestInit, "method">;
	},
): Promise<T> {
	const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
	const cacheKey = options?.cacheKey ?? url;
	const queryKey = urlQueryKey(cacheKey);

	if (options?.force) {
		// Drop the existing entry so `fetchQuery` re-runs the queryFn instead
		// of returning the stale cached value.
		queryClient.removeQueries({ queryKey, exact: true });
	}

	return queryClient.fetchQuery<T>({
		queryKey,
		staleTime: ttlMs,
		gcTime: Math.max(ttlMs * 2, 60 * 1000),
		queryFn: async () => {
			const response = await fetch(url, {
				...options?.fetchInit,
				method: "GET",
				// Use "no-store" so the browser's HTTP cache doesn't shadow
				// our own TTL. With "force-cache" the browser would keep
				// serving stale responses even after invalidation.
				cache: options?.fetchInit?.cache ?? "no-store",
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return (await response.json()) as T;
		},
	});
}

export async function cachedAuthGetJSON<T>(
	url: string,
	options?: {
		ttlMs?: number;
		cacheKey?: string;
		force?: boolean;
		scope?: string | null;
		fetchInit?: Omit<RequestInit, "method">;
	},
): Promise<T> {
	return cachedGetJSON<T>(url, {
		...options,
		cacheKey: getScopedCacheKey(options?.cacheKey ?? url, options?.scope),
		fetchInit: {
			...options?.fetchInit,
			credentials: options?.fetchInit?.credentials ?? "same-origin",
			cache: options?.fetchInit?.cache ?? "no-store",
		},
	});
}
