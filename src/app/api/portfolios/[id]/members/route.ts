import { sendInvitationEmail } from "@/lib/email";
import connectDB from "@/lib/mongoose";
import { InvitationModel } from "@/models/Invitation";
import {
	checkPortfolioAccess,
	PortfolioMemberModel,
	PortfolioModel,
	resolvePermissions,
} from "@/models/Portfolio";
import { UserModel } from "@/models/User";
import { PortfolioMemberStatus, PortfolioRole } from "@/types/property";
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

/** GET /api/portfolios/[id]/members — list all members of a portfolio */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: portfolioId } = await params;
		await connectDB();

		const hasAccess = await checkPortfolioAccess(
			userId,
			portfolioId,
			PortfolioRole.VIEWER,
		);
		if (!hasAccess) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const memberships = await PortfolioMemberModel.find({
			portfolioId,
		}).lean();

		// Enrich with user info
		const userIds = memberships.map((m: any) => m.userId);
		const users = await UserModel.find({ id: { $in: userIds } }).lean();
		const userMap = new Map(users.map((u: any) => [u.id, u]));

		const members = memberships.map((m: any) => {
			const user = userMap.get(m.userId);
			const { _id, __v, ...clean } = m;
			return {
				...clean,
				resolvedPermissions: resolvePermissions(m.role, m.permissions),
				user: user
					? {
							id: user.id,
							name: user.name,
							username: user.username,
							displayName: user.displayName,
							email: user.email,
							avatar: user.avatar,
						}
					: null,
			};
		});

		// Also fetch pending email invitations (non-users)
		const emailInvitations = await InvitationModel.find({
			portfolioId,
			status: "pending",
			expiresAt: { $gt: new Date() },
		}).lean();

		const emailInvites = emailInvitations.map((inv: any) => {
			const { _id, __v, ...clean } = inv;
			return {
				...clean,
				type: "email_invitation",
				status: "pending",
				user: null,
			};
		});

		return NextResponse.json([...members, ...emailInvites]);
	} catch (error) {
		console.error("Error fetching members:", error);
		return NextResponse.json(
			{ error: "Failed to fetch members" },
			{ status: 500 },
		);
	}
}

/** POST /api/portfolios/[id]/members — invite a user by email or username */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id: portfolioId } = await params;
		await connectDB();

		// Only admins can invite
		const isAdmin = await checkPortfolioAccess(
			userId,
			portfolioId,
			PortfolioRole.ADMIN,
		);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const { identifier, email, role } = body;

		// Accept either "identifier" (email or username) or legacy "email"
		const lookup = (identifier || email || "").trim();
		if (!lookup) {
			return NextResponse.json(
				{ error: "Email or username is required" },
				{ status: 400 },
			);
		}

		const validRoles = [
			PortfolioRole.MANAGER,
			PortfolioRole.AGENT,
			PortfolioRole.VIEWER,
		];
		const assignedRole = validRoles.includes(role)
			? role
			: PortfolioRole.VIEWER;

		// Find user by email or username
		const isEmail = lookup.includes("@");
		const invitee = isEmail
			? await UserModel.findOne({ email: lookup.toLowerCase() }).lean()
			: await UserModel.findOne({ username: lookup.toLowerCase() }).lean();

		if (!invitee) {
			// If it's a username that doesn't exist, we can't send an email
			if (!isEmail) {
				return NextResponse.json(
					{ error: "No user found with that username." },
					{ status: 404 },
				);
			}

			// Email user doesn't have an account — create an email invitation
			const emailLower = lookup.toLowerCase();

			// Check for existing pending email invitation
			const existingInvite = await InvitationModel.findOne({
				email: emailLower,
				portfolioId,
				status: "pending",
			}).lean();

			if (existingInvite) {
				return NextResponse.json(
					{ error: "An invitation has already been sent to this email" },
					{ status: 409 },
				);
			}

			const inviteToken = crypto.randomBytes(32).toString("hex");
			const inviteId = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

			await InvitationModel.create({
				id: inviteId,
				email: emailLower,
				portfolioId,
				role: assignedRole,
				token: inviteToken,
				invitedBy: userId,
				status: "pending",
				expiresAt,
			});

			// Get inviter and portfolio info for the email
			const [inviter, portfolio] = await Promise.all([
				UserModel.findOne({ id: userId }).lean(),
				PortfolioModel.findOne({ id: portfolioId }).lean(),
			]);

			const ROLE_LABELS: Record<string, string> = {
				[PortfolioRole.MANAGER]: "Manager",
				[PortfolioRole.AGENT]: "Agent",
				[PortfolioRole.VIEWER]: "Viewer",
			};

			await sendInvitationEmail({
				to: emailLower,
				inviterName: (inviter as any)?.displayName || "A team member",
				portfolioName: (portfolio as any)?.name || "a portfolio",
				role: ROLE_LABELS[assignedRole] || assignedRole,
				token: inviteToken,
				isNewUser: true,
			});

			return NextResponse.json(
				{
					id: inviteId,
					portfolioId,
					email: emailLower,
					role: assignedRole,
					status: "pending",
					type: "email_invitation",
					invitedBy: userId,
				},
				{ status: 201 },
			);
		}

		const inviteeId = (invitee as any).id;

		// Can't invite yourself
		if (inviteeId === userId) {
			return NextResponse.json(
				{ error: "You are already a member of this portfolio" },
				{ status: 400 },
			);
		}

		// Check if already a member
		const existing = await PortfolioMemberModel.findOne({
			portfolioId,
			userId: inviteeId,
		}).lean();

		if (existing) {
			return NextResponse.json(
				{ error: "User is already a member of this portfolio" },
				{ status: 409 },
			);
		}

		const memberId = crypto.randomUUID();
		const membership = await PortfolioMemberModel.create({
			id: memberId,
			portfolioId,
			userId: inviteeId,
			role: assignedRole,
			status: PortfolioMemberStatus.PENDING,
			invitedBy: userId,
		});

		// Send notification email to existing user
		const [inviter, portfolio] = await Promise.all([
			UserModel.findOne({ id: userId }).lean(),
			PortfolioModel.findOne({ id: portfolioId }).lean(),
		]);

		const ROLE_LABELS: Record<string, string> = {
			[PortfolioRole.MANAGER]: "Manager",
			[PortfolioRole.AGENT]: "Agent",
			[PortfolioRole.VIEWER]: "Viewer",
		};

		// Fire and forget — don't block response on email delivery
		sendInvitationEmail({
			to: (invitee as any).email,
			inviterName: (inviter as any)?.displayName || "A team member",
			portfolioName: (portfolio as any)?.name || "a portfolio",
			role: ROLE_LABELS[assignedRole] || assignedRole,
			token: memberId, // existing users use their membership ID
			isNewUser: false,
		}).catch((err) => console.error("[invite] Email send failed:", err));

		const obj = membership.toObject();
		const { _id, __v, ...clean } = obj as any;

		return NextResponse.json(
			{
				...clean,
				user: {
					id: (invitee as any).id,
					name: (invitee as any).name,
					username: (invitee as any).username,
					displayName: (invitee as any).displayName,
					email: (invitee as any).email,
					avatar: (invitee as any).avatar,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error inviting member:", error);
		return NextResponse.json(
			{ error: "Failed to invite member" },
			{ status: 500 },
		);
	}
}
