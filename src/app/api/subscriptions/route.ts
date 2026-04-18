import connectDB from "@/lib/mongoose";
import {
	cancelSubscription,
	createCheckout,
	ensureFreeSubscription,
	getAllTierConfigs,
	getBillingPortalUrl,
	getUserSubscription,
	resumeSubscription,
} from "@/lib/subscription";
import {
	BillingInterval,
	PaymentGatewayType,
	SubscriptionTier,
} from "@/types/subscription";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

async function getAuthUser(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId || null;
}

/** GET /api/subscriptions — get current user's subscription + all tier configs */
export async function GET() {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();
		const subscription = await ensureFreeSubscription(userId);
		const tiers = getAllTierConfigs();

		return NextResponse.json({ subscription, tiers });
	} catch (error) {
		console.error("GET /api/subscriptions error:", error);
		return NextResponse.json(
			{ error: "Failed to load subscription" },
			{ status: 500 },
		);
	}
}

/** POST /api/subscriptions — create checkout session for upgrade */
export async function POST(req: NextRequest) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const tier = body.tier as SubscriptionTier;
		const billingInterval = (body.billingInterval ??
			BillingInterval.MONTHLY) as BillingInterval;
		const gateway = body.gateway as PaymentGatewayType | undefined;

		if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
			return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
		}
		if (tier === SubscriptionTier.FREE) {
			return NextResponse.json(
				{ error: "Cannot checkout for free tier" },
				{ status: 400 },
			);
		}

		// Get user email from DB for checkout
		const { UserModel } = await import("@/models/User");
		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const origin =
			req.headers.get("origin") ??
			process.env.NEXT_PUBLIC_APP_URL ??
			"http://localhost:4600";

		const result = await createCheckout({
			userId,
			email: (user as { email: string }).email,
			tier,
			billingInterval,
			gateway,
			successUrl: `${origin}/settings?subscription=success`,
			cancelUrl: `${origin}/settings?subscription=cancelled`,
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("POST /api/subscriptions error:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout" },
			{ status: 500 },
		);
	}
}

/** PUT /api/subscriptions — cancel or resume subscription */
export async function PUT(req: NextRequest) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const action = body.action as "cancel" | "resume" | "portal";

		switch (action) {
			case "cancel":
				await cancelSubscription(userId);
				break;
			case "resume":
				await resumeSubscription(userId);
				break;
			case "portal": {
				const origin =
					req.headers.get("origin") ??
					process.env.NEXT_PUBLIC_APP_URL ??
					"http://localhost:4600";
				const url = await getBillingPortalUrl(userId, `${origin}/settings`);
				if (!url) {
					return NextResponse.json(
						{ error: "No billing portal available" },
						{ status: 400 },
					);
				}
				return NextResponse.json({ url });
			}
			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		const subscription = await getUserSubscription(userId);
		return NextResponse.json({ subscription });
	} catch (error) {
		console.error("PUT /api/subscriptions error:", error);
		return NextResponse.json(
			{ error: "Failed to update subscription" },
			{ status: 500 },
		);
	}
}
