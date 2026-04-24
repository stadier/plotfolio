"use client";

import { useAuth } from "@/components/AuthContext";
import { convertAmount, type ExchangeRates } from "@/lib/exchangeRates";
import { getCurrencyForCountry, getLocaleForCountry } from "@/lib/locale";
import { useQuery } from "@tanstack/react-query";

async function fetchRates(): Promise<ExchangeRates> {
	const res = await fetch("/api/exchange-rates");
	if (!res.ok) throw new Error("Failed to fetch exchange rates");
	return res.json();
}

/**
 * Returns a `format(amount, sourceCountry)` function that:
 *  1. Resolves the source currency from the property's country
 *  2. Converts to the user's preferred display currency (if set)
 *  3. Formats using Intl.NumberFormat
 *
 * Falls back to the property's own currency when:
 *  - The user hasn't set a display currency, or
 *  - Exchange rates are unavailable
 */
export function useCurrencyConverter() {
	const { user } = useAuth();
	const displayCurrency = user?.displayCurrency;

	const { data: ratesData } = useQuery<ExchangeRates>({
		queryKey: ["exchange-rates"],
		queryFn: fetchRates,
		staleTime: 60 * 60 * 1000, // treat as fresh for 1 hour client-side
		enabled: !!displayCurrency, // only fetch if user has a preference set
	});

	/**
	 * Convert and format a price amount.
	 * @param amount  - raw numeric value stored on the property
	 * @param sourceCountry - country string from the property (e.g. "Nigeria")
	 */
	function format(amount: number, sourceCountry?: string): string {
		const sourceCurrency = getCurrencyForCountry(sourceCountry);

		// If user has a display currency and we have rates, convert
		if (displayCurrency && ratesData?.rates) {
			const converted = convertAmount(
				amount,
				sourceCurrency,
				displayCurrency,
				ratesData.rates,
			);
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: displayCurrency,
				minimumFractionDigits: 0,
			}).format(converted);
		}

		// No conversion — render in the property's local currency
		const locale = getLocaleForCountry(sourceCountry);
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: sourceCurrency,
			minimumFractionDigits: 0,
		}).format(amount);
	}

	/** Compact version: "$1.2M" */
	function formatCompact(amount: number, sourceCountry?: string): string {
		const sourceCurrency = getCurrencyForCountry(sourceCountry);

		if (displayCurrency && ratesData?.rates) {
			const converted = convertAmount(
				amount,
				sourceCurrency,
				displayCurrency,
				ratesData.rates,
			);
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: displayCurrency,
				minimumFractionDigits: 0,
				notation: "compact",
				compactDisplay: "short",
			}).format(converted);
		}

		const locale = getLocaleForCountry(sourceCountry);
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: sourceCurrency,
			minimumFractionDigits: 0,
			notation: "compact",
			compactDisplay: "short",
		}).format(amount);
	}

	return {
		format,
		formatCompact,
		displayCurrency,
		isConverting: !!displayCurrency,
		ratesDate: ratesData?.date,
	};
}
