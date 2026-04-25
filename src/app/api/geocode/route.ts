import { geocodeWithFallbackAndSource } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const q = request.nextUrl.searchParams.get("q");
	const debug = request.nextUrl.searchParams.get("debug") === "1";

	if (!q || q.trim().length < 2) {
		return NextResponse.json([]);
	}

	try {
		const { results, provider } = await geocodeWithFallbackAndSource(q.trim());

		if (debug) {
			return NextResponse.json(
				{ results, provider },
				{
					headers: { "X-Geocode-Provider": provider },
				},
			);
		}

		return NextResponse.json(results, {
			headers: { "X-Geocode-Provider": provider },
		});
	} catch {
		return NextResponse.json([], { status: 500 });
	}
}
