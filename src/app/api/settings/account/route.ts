import connectDB from "@/lib/mongoose";
import { PortfolioMemberModel, PortfolioModel } from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
import { UserModel, verifyPassword } from "@/models/User";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "plotfolio_session";

export async function DELETE(req: NextRequest) {
	try {
		const cookieStore = await cookies();
		const session = cookieStore.get(SESSION_COOKIE)?.value;
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [, userId] = session.split(":");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		const { password } = await req.json();

		if (!password) {
			return NextResponse.json(
				{ error: "Password is required to delete your account" },
				{ status: 400 },
			);
		}

		const user = await UserModel.findOne({ id: userId }).lean();
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const u = user as any;

		// Verify password (skip for google-only accounts — they pass "confirm")
		if (u.passwordHash && u.passwordHash !== "google-oauth") {
			if (!verifyPassword(password, u.passwordHash)) {
				return NextResponse.json(
					{ error: "Incorrect password" },
					{ status: 403 },
				);
			}
		}

		// Delete user's portfolios where they are the sole admin
		const memberships = await PortfolioMemberModel.find({ userId }).lean();
		for (const m of memberships) {
			const membership = m as any;
			if (membership.role === "admin") {
				const otherAdmins = await PortfolioMemberModel.countDocuments({
					portfolioId: membership.portfolioId,
					role: "admin",
					userId: { $ne: userId },
				});
				if (otherAdmins === 0) {
					// Sole admin — delete portfolio and its properties
					await PropertyModel.deleteMany({
						portfolioId: membership.portfolioId,
					});
					await PortfolioMemberModel.deleteMany({
						portfolioId: membership.portfolioId,
					});
					await PortfolioModel.deleteOne({ id: membership.portfolioId });
				}
			}
		}

		// Remove remaining memberships
		await PortfolioMemberModel.deleteMany({ userId });

		// Delete the user
		await UserModel.deleteOne({ id: userId });

		// Clear session cookie
		const responseCookies = await cookies();
		responseCookies.delete(SESSION_COOKIE);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Account deletion error:", error);
		return NextResponse.json(
			{ error: "Failed to delete account" },
			{ status: 500 },
		);
	}
}
