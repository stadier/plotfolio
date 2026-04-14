import {
	DEFAULT_ROLE_PERMISSIONS,
	PortfolioMemberStatus,
	PortfolioRole,
	type Portfolio,
	type PortfolioMember,
	type PortfolioPermissions,
} from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

// ── Portfolio Schema ──────────────────────────────────────────────────────────

const PortfolioSchema = new Schema<Portfolio & Document>(
	{
		id: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		slug: { type: String, required: true, unique: true },
		description: { type: String },
		avatar: { type: String },
		avatarKey: { type: String },
		type: {
			type: String,
			enum: ["personal", "business"],
			default: "personal",
		},
		createdBy: { type: String, required: true, index: true },
	},
	{ timestamps: true },
);

// ── Portfolio Member Schema ───────────────────────────────────────────────────

const PortfolioMemberSchema = new Schema<PortfolioMember & Document>(
	{
		id: { type: String, required: true, unique: true },
		portfolioId: { type: String, required: true, index: true },
		userId: { type: String, required: true, index: true },
		role: {
			type: String,
			enum: Object.values(PortfolioRole),
			default: PortfolioRole.VIEWER,
		},
		status: {
			type: String,
			enum: Object.values(PortfolioMemberStatus),
			default: PortfolioMemberStatus.ACTIVE,
		},
		permissions: {
			canViewProperties: { type: Boolean },
			canCreateProperties: { type: Boolean },
			canEditProperties: { type: Boolean },
			canDeleteProperties: { type: Boolean },
			canViewDocuments: { type: Boolean },
			canUploadDocuments: { type: Boolean },
			canDeleteDocuments: { type: Boolean },
			canManageBookings: { type: Boolean },
			canTransferProperties: { type: Boolean },
			canInviteMembers: { type: Boolean },
		},
		invitedBy: { type: String },
		joinedAt: { type: String },
	},
	{ timestamps: true },
);

// Compound index: a user can only be a member of a portfolio once
PortfolioMemberSchema.index({ portfolioId: 1, userId: 1 }, { unique: true });

// ── Models ────────────────────────────────────────────────────────────────────

export const PortfolioModel =
	mongoose.models.Portfolio ||
	mongoose.model<Portfolio & Document>("Portfolio", PortfolioSchema);

export const PortfolioMemberModel =
	mongoose.models.PortfolioMember ||
	mongoose.model<PortfolioMember & Document>(
		"PortfolioMember",
		PortfolioMemberSchema,
	);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a URL-safe slug from a name, appending a suffix if needed.
 *  Pass excludeId to skip the current portfolio during uniqueness check (for updates). */
export async function generateUniqueSlug(
	name: string,
	excludeId?: string,
): Promise<string> {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
	let slug = base || "portfolio";
	let suffix = 1;
	const filter: Record<string, unknown> = { slug };
	if (excludeId) filter.id = { $ne: excludeId };
	while (await PortfolioModel.findOne(filter).lean()) {
		slug = `${base}-${suffix++}`;
		filter.slug = slug;
	}
	return slug;
}

/** Create a personal portfolio for a new user and add them as admin */
export async function createPersonalPortfolio(
	userId: string,
	displayName: string,
): Promise<Portfolio> {
	const crypto = await import("crypto");
	const portfolioId = crypto.randomUUID();
	const memberId = crypto.randomUUID();
	const slug = await generateUniqueSlug(`${displayName}s Portfolio`);

	const portfolio = await PortfolioModel.create({
		id: portfolioId,
		name: `${displayName}'s Portfolio`,
		slug,
		type: "personal",
		createdBy: userId,
	});

	await PortfolioMemberModel.create({
		id: memberId,
		portfolioId,
		userId,
		role: PortfolioRole.ADMIN,
		status: PortfolioMemberStatus.ACTIVE,
		joinedAt: new Date().toISOString(),
	});

	const obj = portfolio.toObject();
	const { _id, __v, ...clean } = obj as any;
	return clean as Portfolio;
}

/** Get all portfolios a user is a member of (with their role and permissions) */
export async function getUserPortfolios(
	userId: string,
): Promise<
	(Portfolio & { role: PortfolioRole; permissions: PortfolioPermissions })[]
> {
	const memberships = await PortfolioMemberModel.find({
		userId,
		status: PortfolioMemberStatus.ACTIVE,
	}).lean();

	if (memberships.length === 0) return [];

	const portfolioIds = memberships.map((m: any) => m.portfolioId);
	const portfolios = await PortfolioModel.find({
		id: { $in: portfolioIds },
	}).lean();

	const memberMap = new Map(memberships.map((m: any) => [m.portfolioId, m]));

	return portfolios.map((p: any) => {
		const { _id, __v, ...clean } = p;
		const member = memberMap.get(clean.id);
		const role = (member?.role as PortfolioRole) ?? PortfolioRole.VIEWER;
		return {
			...clean,
			role,
			permissions: resolvePermissions(role, member?.permissions),
		};
	}) as (Portfolio & {
		role: PortfolioRole;
		permissions: PortfolioPermissions;
	})[];
}

/** Check if a user has at least the given role in a portfolio */
export async function checkPortfolioAccess(
	userId: string,
	portfolioId: string,
	requiredRole: PortfolioRole,
): Promise<boolean> {
	const roleHierarchy: Record<PortfolioRole, number> = {
		[PortfolioRole.ADMIN]: 4,
		[PortfolioRole.MANAGER]: 3,
		[PortfolioRole.AGENT]: 2,
		[PortfolioRole.VIEWER]: 1,
	};

	const membership = await PortfolioMemberModel.findOne({
		portfolioId,
		userId,
		status: PortfolioMemberStatus.ACTIVE,
	}).lean();

	if (!membership) return false;

	const userLevel =
		roleHierarchy[(membership as any).role as PortfolioRole] ?? 0;
	const requiredLevel = roleHierarchy[requiredRole] ?? 0;
	return userLevel >= requiredLevel;
}

/** Resolve effective permissions for a member (role defaults + overrides) */
export function resolvePermissions(
	role: PortfolioRole,
	overrides?: Partial<PortfolioPermissions> | null,
): PortfolioPermissions {
	const defaults =
		DEFAULT_ROLE_PERMISSIONS[role] ??
		DEFAULT_ROLE_PERMISSIONS[PortfolioRole.VIEWER];
	if (!overrides) return { ...defaults };
	const result = { ...defaults };
	for (const key of Object.keys(defaults) as (keyof PortfolioPermissions)[]) {
		if (overrides[key] !== undefined && overrides[key] !== null) {
			result[key] = overrides[key]!;
		}
	}
	return result;
}
