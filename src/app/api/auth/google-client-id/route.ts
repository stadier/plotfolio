import { NextResponse } from "next/server";

export async function GET() {
	const clientId = process.env.GOOGLE_CLIENT_ID;

	if (!clientId) {
		return NextResponse.json({ clientId: null }, { status: 404 });
	}

	return NextResponse.json({ clientId });
}
