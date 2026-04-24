/**
 * Exchange rate fetching + server-side memory cache.
 *
 * Uses the Frankfurter API (ECB data, no API key required).
 * Rates are fetched once and cached for 24 hours per process.
 * Base currency: USD.
 */

export interface ExchangeRates {
	base: string;
	date: string;
	rates: Record<string, number>;
}

/** In-memory cache so we only hit Frankfurter once per 24 h per process. */
let cache: { data: ExchangeRates; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchExchangeRates(): Promise<ExchangeRates> {
	const now = Date.now();
	if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
		return cache.data;
	}

	const res = await fetch("https://api.frankfurter.app/latest?base=USD", {
		next: { revalidate: 86400 }, // Next.js data cache: revalidate daily
	});

	if (!res.ok) {
		// If the upstream fails and we have stale data, return it gracefully.
		if (cache) return cache.data;
		throw new Error(`Frankfurter API returned ${res.status}`);
	}

	const json = await res.json();

	// Frankfurter doesn't include the base currency itself — add it.
	const data: ExchangeRates = {
		base: json.base,
		date: json.date,
		rates: { [json.base]: 1, ...json.rates },
	};

	cache = { data, fetchedAt: now };
	return data;
}

/**
 * Convert `amount` from `fromCurrency` to `toCurrency` using the cached rates.
 * Returns the original amount unchanged if either currency is missing.
 */
export function convertAmount(
	amount: number,
	fromCurrency: string,
	toCurrency: string,
	rates: Record<string, number>,
): number {
	if (fromCurrency === toCurrency) return amount;
	const fromRate = rates[fromCurrency.toUpperCase()];
	const toRate = rates[toCurrency.toUpperCase()];
	if (!fromRate || !toRate) return amount;
	// Both rates are relative to USD, so: amount / fromRate * toRate
	return (amount / fromRate) * toRate;
}
