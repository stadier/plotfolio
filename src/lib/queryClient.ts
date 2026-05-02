"use client";

import { QueryClient } from "@tanstack/react-query";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Singleton QueryClient shared across the entire app.
 *
 * Why a singleton: non-React modules (e.g. `lib/api.ts`, `lib/clientCache.ts`,
 * the upload tray) need to invalidate or read cached data without going
 * through the React tree. Exporting a single instance from this module lets
 * those callers reach the same cache that React Query hooks consume.
 *
 * `QueryProvider` imports this instance directly instead of creating its
 * own. That guarantees there is exactly one cache in the app — eliminating
 * the "two caches out of sync" class of bug where the legacy
 * `cachedGetJSON` store and the React Query store could disagree.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Short stale window so navigating between pages refetches lists.
			// Long stale times caused "deleted item comes back later" because
			// pre-mutation snapshots were rehydrated and served without a
			// refetch.
			staleTime: 30 * 1000,
			gcTime: CACHE_MAX_AGE_MS,
			refetchOnMount: true,
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
			retry: 1,
		},
	},
});

export const QUERY_CLIENT_CACHE_MAX_AGE_MS = CACHE_MAX_AGE_MS;
