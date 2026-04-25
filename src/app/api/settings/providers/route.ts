import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import {
	PROVIDER_CATEGORIES,
	PROVIDER_DEFAULTS,
	ProviderSettings,
} from "@/types/providers";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

async function getAuthContext() {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;

	const [token, userId] = session.split(":");
	if (!token || !userId) return null;

	await connectDB();
	const user = await UserModel.findOne({ id: userId }).lean();
	if (!user) return null;

	// Keep behavior aligned with login/auth flows by requiring the current session token.
	if ((user as any).sessionToken && (user as any).sessionToken !== token) {
		return null;
	}

	return { user, userId };
}

/** GET — return current provider settings (merged with defaults) */
export async function GET() {
	try {
		const auth = await getAuthContext();
		if (!auth) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const saved = (auth.user as any).providerSettings ?? {};
		const merged: ProviderSettings = { ...PROVIDER_DEFAULTS, ...saved };

		return NextResponse.json({ providerSettings: merged });
	} catch (error) {
		console.error("Error fetching provider settings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch settings" },
			{ status: 500 },
		);
	}
}

/** PUT — update provider settings */
export async function PUT(request: NextRequest) {
	try {
		const auth = await getAuthContext();
		if (!auth) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const incoming = body.providerSettings as Partial<ProviderSettings>;
		if (!incoming || typeof incoming !== "object") {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		// Validate each key-value against allowed options
		const validKeys = PROVIDER_CATEGORIES.map((c) => c.key);
		const sanitised: Partial<ProviderSettings> = {};

		for (const [key, value] of Object.entries(incoming)) {
			if (!validKeys.includes(key as keyof ProviderSettings)) continue;
			const category = PROVIDER_CATEGORIES.find((c) => c.key === key);
			if (!category) continue;
			if (!category.options.some((o) => o.value === value)) continue;
			(sanitised as Record<string, string>)[key] = value as string;
		}

		if (Object.keys(sanitised).length === 0) {
			return NextResponse.json(
				{ error: "No valid provider settings supplied" },
				{ status: 400 },
			);
		}

		const existing = ((auth.user as any).providerSettings ??
			{}) as Partial<ProviderSettings>;
		const nextSettings: Partial<ProviderSettings> = {
			...existing,
			...sanitised,
		};

		const updateResult = await UserModel.updateOne(
			{ id: auth.userId },
			{ $set: { providerSettings: nextSettings } },
		);

		if (updateResult.matchedCount === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const merged: ProviderSettings = { ...PROVIDER_DEFAULTS, ...nextSettings };
		return NextResponse.json({ providerSettings: merged });
	} catch (error) {
		console.error("Error updating provider settings:", error);
		return NextResponse.json(
			{ error: "Failed to update settings" },
			{ status: 500 },
		);
	}
}
