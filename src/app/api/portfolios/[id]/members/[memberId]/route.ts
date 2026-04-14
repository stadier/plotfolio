import connectDB from "@/lib/mongoose";
import { checkPortfolioAccess, PortfolioMemberModel } from "@/models/Portfolio";
import {
	PortfolioMemberStatus,
	PortfolioRole,
	type PortfolioPermissions,
} from "@/types/property";
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

/** PUT /api/portfolios/[id]/members/[memberId] — update role, accept invite, suspend */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: portfolioId, memberId } = await params;
		await connectDB();

		const membership = await PortfolioMemberModel.findOne({
			id: memberId,
			portfolioId,
		}).lean();

		if (!membership) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const body = await request.json();

		// Allow the invited user to accept their own invite
		if (
			body.status === PortfolioMemberStatus.ACTIVE &&
			(membership as any).userId === userId &&
			(membership as any).status === PortfolioMemberStatus.PENDING
		) {
			const updated = await PortfolioMemberModel.findOneAndUpdate(
				{ id: memberId },
				{
					$set: {
						status: PortfolioMemberStatus.ACTIVE,
						joinedAt: new Date().toISOString(),
					},
				},
				{ new: true },
			).lean();

			const { _id, __v, ...clean } = updated as any;
			return NextResponse.json(clean);
		}

		// All other operations require admin
		const isAdmin = await checkPortfolioAccess(
			userId,
			portfolioId,
			PortfolioRole.ADMIN,
		);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Don't allow changing the role of the last admin
		if (body.role && body.role !== PortfolioRole.ADMIN) {
			if ((membership as any).role === PortfolioRole.ADMIN) {
				const adminCount = await PortfolioMemberModel.countDocuments({
					portfolioId,
					role: PortfolioRole.ADMIN,
					status: PortfolioMemberStatus.ACTIVE,
				});
				if (adminCount <= 1) {
					return NextResponse.json(
						{ error: "Cannot change the role of the only admin" },
						{ status: 400 },
					);
				}
			}
		}

		const updates: Record<string, any> = {};
		if (body.role && Object.values(PortfolioRole).includes(body.role)) {
			updates.role = body.role;
			// Reset custom permissions when role changes
			updates.permissions = undefined;
		}
		if (
			body.status &&
			Object.values(PortfolioMemberStatus).includes(body.status)
		) {
			updates.status = body.status;
			if (body.status === PortfolioMemberStatus.ACTIVE) {
				updates.joinedAt = new Date().toISOString();
			}
		}
		// Allow setting custom permission overrides
		if (body.permissions !== undefined) {
			const VALID_KEYS: (keyof PortfolioPermissions)[] = [
				"canViewProperties",
				"canCreateProperties",
				"canEditProperties",
				"canDeleteProperties",
				"canViewDocuments",
				"canUploadDocuments",
				"canDeleteDocuments",
				"canManageBookings",
				"canTransferProperties",
				"canInviteMembers",
			];
			const sanitized: Record<string, boolean> = {};
			for (const key of VALID_KEYS) {
				if (typeof body.permissions[key] === "boolean") {
					sanitized[key] = body.permissions[key];
				}
			}
			updates.permissions =
				Object.keys(sanitized).length > 0 ? sanitized : undefined;
		}

		const updated = await PortfolioMemberModel.findOneAndUpdate(
			{ id: memberId },
			{ $set: updates },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const { _id, __v, ...clean } = updated as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating member:", error);
		return NextResponse.json(
			{ error: "Failed to update member" },
			{ status: 500 },
		);
	}
}

/** DELETE /api/portfolios/[id]/members/[memberId] — remove a member */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: portfolioId, memberId } = await params;
		await connectDB();

		const membership = await PortfolioMemberModel.findOne({
			id: memberId,
			portfolioId,
		}).lean();

		if (!membership) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		// A user can remove themselves (leave)
		const isSelf = (membership as any).userId === userId;

		if (!isSelf) {
			// Only admins can remove others
			const isAdmin = await checkPortfolioAccess(
				userId,
				portfolioId,
				PortfolioRole.ADMIN,
			);
			if (!isAdmin) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		// Don't allow the last admin to leave
		if ((membership as any).role === PortfolioRole.ADMIN) {
			const adminCount = await PortfolioMemberModel.countDocuments({
				portfolioId,
				role: PortfolioRole.ADMIN,
				status: PortfolioMemberStatus.ACTIVE,
			});
			if (adminCount <= 1) {
				return NextResponse.json(
					{ error: "Cannot remove the only admin. Transfer admin role first." },
					{ status: 400 },
				);
			}
		}

		await PortfolioMemberModel.deleteOne({ id: memberId });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error removing member:", error);
		return NextResponse.json(
			{ error: "Failed to remove member" },
			{ status: 500 },
		);
	}
}
