import { getReverseGeocodeWithFallback } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const lat = request.nextUrl.searchParams.get("lat");
	const lon = request.nextUrl.searchParams.get("lon");

	if (!lat || !lon) {
		return NextResponse.json(
			{ error: "lat and lon are required" },
			{ status: 400 },
		);
	}

	const latNum = parseFloat(lat);
	const lonNum = parseFloat(lon);
	if (isNaN(latNum) || isNaN(lonNum)) {
		return NextResponse.json(
			{ error: "lat and lon must be numbers" },
			{ status: 400 },
		);
	}

	try {
		const reverse = getReverseGeocodeWithFallback();
		const result = await reverse(latNum, lonNum);
		if (!result) {
			return NextResponse.json(null);
		}
		return NextResponse.json(result);
	} catch {
		return NextResponse.json(null, { status: 500 });
	}
}
