import connectDB from "@/lib/mongoose";
import { InvitationModel } from "@/models/Invitation";
import { checkPortfolioAccess } from "@/models/Portfolio";
import { PortfolioRole } from "@/types/property";
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

/** DELETE /api/portfolios/[id]/email-invitations/[invitationId] — cancel a pending email invitation */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; invitationId: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: portfolioId, invitationId } = await params;
		await connectDB();

		const isAdmin = await checkPortfolioAccess(
			userId,
			portfolioId,
			PortfolioRole.ADMIN,
		);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const result = await InvitationModel.deleteOne({
			id: invitationId,
			portfolioId,
			status: "pending",
		});

		if (result.deletedCount === 0) {
			return NextResponse.json(
				{ error: "Invitation not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error cancelling invitation:", error);
		return NextResponse.json(
			{ error: "Failed to cancel invitation" },
			{ status: 500 },
		);
	}
}
