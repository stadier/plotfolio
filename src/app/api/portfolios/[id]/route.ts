import connectDB from "@/lib/mongoose";
import {
	checkPortfolioAccess,
	generateUniqueSlug,
	PortfolioMemberModel,
	PortfolioModel,
} from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
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

/** GET /api/portfolios/[id] — get a single portfolio with member count */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const hasAccess = await checkPortfolioAccess(
			userId,
			id,
			PortfolioRole.VIEWER,
		);
		if (!hasAccess) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const portfolio = await PortfolioModel.findOne({ id }).lean();
		if (!portfolio) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const memberCount = await PortfolioMemberModel.countDocuments({
			portfolioId: id,
			status: "active",
		});

		const { _id, __v, ...clean } = portfolio as any;
		return NextResponse.json({ ...clean, memberCount });
	} catch (error) {
		console.error("Error fetching portfolio:", error);
		return NextResponse.json(
			{ error: "Failed to fetch portfolio" },
			{ status: 500 },
		);
	}
}

/** PUT /api/portfolios/[id] — update portfolio name/description/avatar */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const isAdmin = await checkPortfolioAccess(userId, id, PortfolioRole.ADMIN);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const updates: Record<string, any> = {};

		if (body.name && typeof body.name === "string") {
			updates.name = body.name.trim();
			updates.slug = await generateUniqueSlug(body.name.trim(), id);
		}
		if (body.description !== undefined) {
			updates.description = body.description?.trim() || undefined;
		}
		if (body.avatar !== undefined) {
			updates.avatar = body.avatar ?? undefined;
		}

		const updated = await PortfolioModel.findOneAndUpdate(
			{ id },
			{ $set: updates },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const { _id, __v, ...clean } = updated as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating portfolio:", error);
		return NextResponse.json(
			{ error: "Failed to update portfolio" },
			{ status: 500 },
		);
	}
}

/** DELETE /api/portfolios/[id] — delete a portfolio (admin only, not personal) */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const userId = await getAuthUser();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const isAdmin = await checkPortfolioAccess(userId, id, PortfolioRole.ADMIN);
		if (!isAdmin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const portfolio = await PortfolioModel.findOne({ id }).lean();
		if (!portfolio) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		if ((portfolio as any).type === "personal") {
			return NextResponse.json(
				{ error: "Cannot delete your personal portfolio" },
				{ status: 400 },
			);
		}

		// Check for properties still in this portfolio
		const propertyCount = await PropertyModel.countDocuments({
			portfolioId: id,
		});
		if (propertyCount > 0) {
			return NextResponse.json(
				{
					error: `Portfolio still has ${propertyCount} properties. Move or delete them first.`,
				},
				{ status: 400 },
			);
		}

		// Remove all memberships and the portfolio
		await PortfolioMemberModel.deleteMany({ portfolioId: id });
		await PortfolioModel.deleteOne({ id });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting portfolio:", error);
		return NextResponse.json(
			{ error: "Failed to delete portfolio" },
			{ status: 500 },
		);
	}
}
