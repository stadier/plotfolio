"use client";

import { getReactQueryCacheStorageKey } from "@/lib/cacheScope";
import {
	dehydrate,
	hydrate,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

const CACHE_PERSIST_THROTTLE_MS = 1500;

export default function QueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [hydrated, setHydrated] = useState(false);
	const [queryClient] = useState(() => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 10 * 60 * 1000, // 10 minutes before data is considered stale
					gcTime: 24 * 60 * 60 * 1000, // keep cached query data for 24 hours
					refetchOnWindowFocus: false,
					refetchOnReconnect: false,
					retry: 1,
				},
			},
		});

		if (typeof window !== "undefined") {
			try {
				const raw = localStorage.getItem(getReactQueryCacheStorageKey());
				if (raw) {
					hydrate(client, JSON.parse(raw));
				}
			} catch {
				// Ignore malformed cache entries and boot with a fresh cache.
			}
		}

		return client;
	});

	useEffect(() => {
		setHydrated(true);
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const unsubscribe = queryClient.getQueryCache().subscribe(() => {
			if (timeoutId) return;
			timeoutId = setTimeout(() => {
				timeoutId = null;
				try {
					const snapshot = dehydrate(queryClient, {
						shouldDehydrateQuery: (query) => query.state.status === "success",
					});
					localStorage.setItem(
						getReactQueryCacheStorageKey(),
						JSON.stringify(snapshot),
					);
				} catch {
					// Ignore storage quota pressure and continue using in-memory cache.
				}
			}, CACHE_PERSIST_THROTTLE_MS);
		});

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			unsubscribe();
		};
	}, [queryClient]);

	if (!hydrated) {
		return null;
	}

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
