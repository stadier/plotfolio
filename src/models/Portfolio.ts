import {
	PortfolioMemberStatus,
	PortfolioRole,
	type Portfolio,
	type PortfolioMember,
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

/** Generate a URL-safe slug from a name, appending a suffix if needed */
export async function generateUniqueSlug(name: string): Promise<string> {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
	let slug = base || "portfolio";
	let suffix = 1;
	while (await PortfolioModel.findOne({ slug }).lean()) {
		slug = `${base}-${suffix++}`;
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

/** Get all portfolios a user is a member of (with their role) */
export async function getUserPortfolios(
	userId: string,
): Promise<(Portfolio & { role: PortfolioRole })[]> {
	const memberships = await PortfolioMemberModel.find({
		userId,
		status: PortfolioMemberStatus.ACTIVE,
	}).lean();

	if (memberships.length === 0) return [];

	const portfolioIds = memberships.map((m: any) => m.portfolioId);
	const portfolios = await PortfolioModel.find({
		id: { $in: portfolioIds },
	}).lean();

	const roleMap = new Map(memberships.map((m: any) => [m.portfolioId, m.role]));

	return portfolios.map((p: any) => {
		const { _id, __v, ...clean } = p;
		return { ...clean, role: roleMap.get(clean.id) ?? PortfolioRole.VIEWER };
	}) as (Portfolio & { role: PortfolioRole })[];
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
