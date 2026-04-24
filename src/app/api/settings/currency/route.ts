import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

/** Validate that a value looks like an ISO 4217 currency code (3 uppercase letters). */
function isValidCurrencyCode(code: unknown): code is string {
	return typeof code === "string" && /^[A-Z]{3}$/.test(code);
}

export async function PUT(req: NextRequest) {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get(SESSION_COOKIE)?.value;
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [, userId] = session.split(":");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const { currency } = body;

		// Allow unsetting (null/empty) or setting a valid ISO 4217 code
		if (
			currency !== null &&
			currency !== "" &&
			!isValidCurrencyCode(currency)
		) {
			return NextResponse.json(
				{ error: "Invalid currency code" },
				{ status: 400 },
			);
		}

		const displayCurrency = currency || undefined;

		await UserModel.updateOne(
			{ id: userId },
			{ $set: { displayCurrency: displayCurrency ?? null } },
		);

		return NextResponse.json({ displayCurrency });
	} catch (error) {
		console.error("Currency setting error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
