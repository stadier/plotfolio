"use client";

import { QUERY_CLIENT_CACHE_MAX_AGE_MS, queryClient } from "@/lib/queryClient";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";

const CACHE_MAX_AGE_MS = QUERY_CLIENT_CACHE_MAX_AGE_MS;
const STORAGE_KEY_PREFIX = "plotfolio:react-query-cache:";
const GUEST_SCOPE = "guest";

export default function QueryProvider({
	children,
	initialUserId,
}: {
	children: React.ReactNode;
	/**
	 * User ID resolved on the server (via the root layout). Used to scope the
	 * persisted cache so user A's cached data can never appear for user B on
	 * the same browser. Falls back to a "guest" scope when no one is logged in.
	 */
	initialUserId?: string | null;
}) {
	const scope = initialUserId ?? GUEST_SCOPE;

	const [persister] = useState(() => {
		// On the server there's no localStorage. Return a no-op storage so the
		// persister constructs cleanly during SSR; the real storage takes over
		// on the client.
		const storage =
			typeof window !== "undefined"
				? window.localStorage
				: (undefined as unknown as Storage);
		return createSyncStoragePersister({
			storage,
			key: `${STORAGE_KEY_PREFIX}${scope}`,
			throttleTime: 1500,
		});
	});

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				maxAge: CACHE_MAX_AGE_MS,
				// `buster` invalidates the persisted snapshot when it changes —
				// scope it by user so logging in as someone else discards any
				// previously persisted data instead of rehydrating it.
				buster: scope,
				dehydrateOptions: {
					// Only persist queries that are fresh, idle, successful, and
					// have actual data. Persisting stale or in-flight queries
					// caused "I delete X and after reload it's back" because
					// pre-mutation snapshots were rehydrated and served while
					// staleTime suppressed any refetch.
					shouldDehydrateQuery: (query) =>
						query.state.status === "success" &&
						query.state.fetchStatus === "idle" &&
						!query.isStale() &&
						query.state.data !== undefined,
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}
