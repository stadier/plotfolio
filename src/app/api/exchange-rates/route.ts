import { fetchExchangeRates } from "@/lib/exchangeRates";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const rates = await fetchExchangeRates();
		return NextResponse.json(rates, {
			headers: {
				// Allow clients to cache for 1 hour; server re-fetches every 24 h
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
			},
		});
	} catch (error) {
		console.error("Exchange rates fetch error:", error);
		return NextResponse.json(
			{ error: "Unable to fetch exchange rates" },
			{ status: 503 },
		);
	}
}
