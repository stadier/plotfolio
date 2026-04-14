import { generateContractHtml } from "@/lib/contractTemplates";
import connectDB from "@/lib/mongoose";
import { UserModel } from "@/models/User";
import { ContractType } from "@/types/seal";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

async function getAuthUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;
	const [, userId] = session.split(":");
	return userId ?? null;
}

/* ─── POST /api/documents/generate — generate a contract ──────── */
export async function POST(req: NextRequest) {
	try {
		const userId = await getAuthUserId();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const body = await req.json();
		const {
			contractType,
			propertyId,
			propertyName,
			propertyAddress,
			partyA,
			partyB,
			amount,
			currency,
			startDate,
			endDate,
			additionalClauses,
			witnesses,
			sealId,
		} = body;

		if (!contractType || !Object.values(ContractType).includes(contractType)) {
			return NextResponse.json(
				{ error: "Invalid contract type" },
				{ status: 400 },
			);
		}

		if (!partyA?.name || !partyB?.name) {
			return NextResponse.json(
				{ error: "Both parties are required" },
				{ status: 400 },
			);
		}

		if (amount === undefined || amount <= 0) {
			return NextResponse.json(
				{ error: "Valid amount is required" },
				{ status: 400 },
			);
		}

		// Get user's seal and letterhead
		let sealImageUrl: string | undefined;
		let sealName: string | undefined;
		let letterhead: Record<string, unknown> | undefined;

		const user = await UserModel.findOne({ id: userId }).lean();
		if (user) {
			const userData = user as Record<string, unknown>;

			if (sealId) {
				const seals = userData.seals as Array<{
					id: string;
					imageUrl?: string;
					name: string;
				}>;
				const seal = seals?.find((s) => s.id === sealId);
				if (seal) {
					sealImageUrl = seal.imageUrl;
					sealName = seal.name;
				}
			}

			if (userData.letterhead) {
				letterhead = userData.letterhead as Record<string, unknown>;
			}
		}

		const html = generateContractHtml({
			contractType,
			propertyName: propertyName || "Property",
			propertyAddress: propertyAddress || "",
			propertyId: propertyId || "",
			partyA,
			partyB,
			amount,
			currency: currency || "USD",
			startDate,
			endDate,
			additionalClauses: additionalClauses || [],
			witnesses: witnesses || [],
			sealImageUrl,
			sealName,
			generatedDate: new Date().toISOString(),
			letterhead: letterhead as
				| import("@/types/seal").LetterheadConfig
				| undefined,
		});

		return NextResponse.json({
			html,
			contractType,
			title: `${contractType.charAt(0).toUpperCase() + contractType.slice(1)} Contract — ${propertyName || "Property"}`,
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Generate contract error:", error);
		return NextResponse.json(
			{ error: "Failed to generate contract" },
			{ status: 500 },
		);
	}
}
