const CLIENT_CACHE_SCOPE_STORAGE_KEY = "plotfolio-cache-scope";
const GUEST_CACHE_SCOPE = "guest";
const QUERY_CACHE_STORAGE_PREFIX = "plotfolio:react-query-cache:";

function canUseStorage(): boolean {
	return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeCacheScope(scope: string | null | undefined): string {
	const trimmed = scope?.trim();
	return trimmed ? trimmed : GUEST_CACHE_SCOPE;
}

export function getClientCacheScope(): string {
	if (!canUseStorage()) return GUEST_CACHE_SCOPE;
	try {
		return normalizeCacheScope(
			localStorage.getItem(CLIENT_CACHE_SCOPE_STORAGE_KEY),
		);
	} catch {
		return GUEST_CACHE_SCOPE;
	}
}

export function setClientCacheScope(scope: string | null | undefined) {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(
			CLIENT_CACHE_SCOPE_STORAGE_KEY,
			normalizeCacheScope(scope),
		);
	} catch {
		// Ignore storage failures and continue with in-memory cache only.
	}
}

export function clearClientCacheScope() {
	if (!canUseStorage()) return;
	try {
		localStorage.removeItem(CLIENT_CACHE_SCOPE_STORAGE_KEY);
	} catch {
		// Ignore storage failures.
	}
}

export function getScopedCacheKey(key: string, scope?: string | null): string {
	return `${normalizeCacheScope(scope ?? getClientCacheScope())}::${key}`;
}

export function getReactQueryCacheStorageKey(scope?: string | null): string {
	return `${QUERY_CACHE_STORAGE_PREFIX}${normalizeCacheScope(scope ?? getClientCacheScope())}`;
}
