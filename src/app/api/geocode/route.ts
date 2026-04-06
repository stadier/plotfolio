import { getGeocodeProvider } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const q = request.nextUrl.searchParams.get("q");

	if (!q || q.trim().length < 2) {
		return NextResponse.json([]);
	}

	try {
		const search = getGeocodeProvider();
		const results = await search(q.trim());
		return NextResponse.json(results);
	} catch {
		return NextResponse.json([], { status: 500 });
	}
}
