import { getScopedCacheKey } from "@/lib/cacheScope";

const STORAGE_PREFIX = "plotfolio:get-cache:";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheRecord<T> = {
	expiresAt: number;
	data: T;
};

const memoryCache = new Map<string, CacheRecord<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function canUseStorage(): boolean {
	return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStorageRecord<T>(key: string): CacheRecord<T> | null {
	if (!canUseStorage()) return null;
	try {
		const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CacheRecord<T>;
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			typeof parsed.expiresAt !== "number" ||
			!("data" in parsed)
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

function writeStorageRecord<T>(key: string, value: CacheRecord<T>) {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
	} catch {
		// Ignore quota and serialization failures.
	}
}

function removeStorageRecord(key: string) {
	if (!canUseStorage()) return;
	try {
		localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
	} catch {
		// ignore
	}
}

export function invalidateCachedGet(match?: string | RegExp) {
	if (!match) {
		memoryCache.clear();
		inFlight.clear();
		if (canUseStorage()) {
			for (let i = localStorage.length - 1; i >= 0; i -= 1) {
				const key = localStorage.key(i);
				if (key?.startsWith(STORAGE_PREFIX)) {
					localStorage.removeItem(key);
				}
			}
		}
		return;
	}

	const matches = (key: string) =>
		typeof match === "string" ? key.includes(match) : match.test(key);

	for (const key of Array.from(memoryCache.keys())) {
		if (matches(key)) memoryCache.delete(key);
	}
	for (const key of Array.from(inFlight.keys())) {
		if (matches(key)) inFlight.delete(key);
	}

	if (canUseStorage()) {
		for (let i = localStorage.length - 1; i >= 0; i -= 1) {
			const fullKey = localStorage.key(i);
			if (!fullKey?.startsWith(STORAGE_PREFIX)) continue;
			const key = fullKey.slice(STORAGE_PREFIX.length);
			if (matches(key)) localStorage.removeItem(fullKey);
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
	const now = Date.now();

	if (!options?.force) {
		const memo = memoryCache.get(cacheKey) as CacheRecord<T> | undefined;
		if (memo && memo.expiresAt > now) {
			return memo.data;
		}

		const stored = readStorageRecord<T>(cacheKey);
		if (stored && stored.expiresAt > now) {
			memoryCache.set(cacheKey, stored as CacheRecord<unknown>);
			return stored.data;
		}
		if (stored) {
			removeStorageRecord(cacheKey);
		}

		const pending = inFlight.get(cacheKey) as Promise<T> | undefined;
		if (pending) return pending;
	}

	const request = fetch(url, {
		...options?.fetchInit,
		method: "GET",
		// Use "no-store" so the browser's HTTP cache doesn't override our
		// own localStorage-based TTL cache. With "force-cache", the browser
		// would keep serving stale responses even after we call
		// invalidateCachedGet(), causing uploaded media/docs to be invisible
		// on subsequent fetches until the HTTP cache entry happens to expire.
		cache: options?.fetchInit?.cache ?? "no-store",
	}).then(async (response) => {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = (await response.json()) as T;
		const record: CacheRecord<T> = {
			expiresAt: now + ttlMs,
			data,
		};
		memoryCache.set(cacheKey, record as CacheRecord<unknown>);
		writeStorageRecord(cacheKey, record);
		return data;
	});

	inFlight.set(cacheKey, request as Promise<unknown>);
	try {
		return await request;
	} finally {
		inFlight.delete(cacheKey);
	}
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
