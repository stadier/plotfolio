import connectDB from "@/lib/mongoose";
import { InvitationModel } from "@/models/Invitation";
import { PortfolioMemberModel, PortfolioModel } from "@/models/Portfolio";
import { UserModel } from "@/models/User";
import { PortfolioMemberStatus } from "@/types/property";
import crypto from "crypto";
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

/** GET /api/invitations/[token] — get invitation details (public) */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	try {
		const { token } = await params;
		await connectDB();

		const invitation = await InvitationModel.findOne({
			token,
			status: "pending",
		}).lean();

		if (!invitation) {
			return NextResponse.json(
				{ error: "Invitation not found or has expired" },
				{ status: 404 },
			);
		}

		if (new Date((invitation as any).expiresAt) < new Date()) {
			await InvitationModel.updateOne({ token }, { status: "expired" });
			return NextResponse.json(
				{ error: "This invitation has expired" },
				{ status: 410 },
			);
		}

		const portfolio = await PortfolioModel.findOne({
			id: (invitation as any).portfolioId,
		}).lean();

		const inviter = await UserModel.findOne({
			id: (invitation as any).invitedBy,
		}).lean();

		return NextResponse.json({
			email: (invitation as any).email,
			role: (invitation as any).role,
			portfolioName: (portfolio as any)?.name || "Unknown portfolio",
			inviterName: (inviter as any)?.displayName || "A team member",
		});
	} catch (error) {
		console.error("Error fetching invitation:", error);
		return NextResponse.json(
			{ error: "Failed to fetch invitation" },
			{ status: 500 },
		);
	}
}

/** POST /api/invitations/[token] — accept an invitation (must be authenticated) */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { token } = await params;
		await connectDB();

		const invitation = await InvitationModel.findOne({
			token,
			status: "pending",
		}).lean();

		if (!invitation) {
			return NextResponse.json(
				{ error: "Invitation not found or has expired" },
				{ status: 404 },
			);
		}

		if (new Date((invitation as any).expiresAt) < new Date()) {
			await InvitationModel.updateOne({ token }, { status: "expired" });
			return NextResponse.json(
				{ error: "This invitation has expired" },
				{ status: 410 },
			);
		}

		const inv = invitation as any;

		// Verify the authenticated user's email matches the invitation
		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user || (user as any).email !== inv.email) {
			return NextResponse.json(
				{
					error:
						"This invitation was sent to a different email address. Please sign in with the correct account.",
				},
				{ status: 403 },
			);
		}

		// Check if user is already a member
		const existing = await PortfolioMemberModel.findOne({
			portfolioId: inv.portfolioId,
			userId,
		}).lean();

		if (existing) {
			// Mark invitation as accepted anyway
			await InvitationModel.updateOne({ token }, { status: "accepted" });
			return NextResponse.json({
				message: "You are already a member of this portfolio",
			});
		}

		// Create the membership
		const memberId = crypto.randomUUID();
		await PortfolioMemberModel.create({
			id: memberId,
			portfolioId: inv.portfolioId,
			userId,
			role: inv.role,
			status: PortfolioMemberStatus.ACTIVE,
			invitedBy: inv.invitedBy,
			joinedAt: new Date().toISOString(),
		});

		// Mark invitation as accepted
		await InvitationModel.updateOne({ token }, { status: "accepted" });

		return NextResponse.json({
			message: "Invitation accepted",
			portfolioId: inv.portfolioId,
		});
	} catch (error) {
		console.error("Error accepting invitation:", error);
		return NextResponse.json(
			{ error: "Failed to accept invitation" },
			{ status: 500 },
		);
	}
}
