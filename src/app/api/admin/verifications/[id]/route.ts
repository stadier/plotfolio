/**
 * PATCH /api/admin/verifications/[id]
 * Body: { action: "approve" | "reject", reason? }
 */

import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { VerificationRequestModel } from "@/models/Sale";
import { UserModel } from "@/models/User";
import { VerificationMethod, VerificationStatus } from "@/types/sale";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		if (!user.isAdmin)
			return NextResponse.json({ error: "Admin only" }, { status: 403 });

		await connectDB();
		const { id } = await params;
		const { action, reason } = await request.json();

		const req = await VerificationRequestModel.findOne({ id });
		if (!req)
			return NextResponse.json(
				{ error: "Verification request not found" },
				{ status: 404 },
			);

		const now = new Date().toISOString();
		req.reviewedAt = now;
		req.reviewedBy = user.id;

		if (action === "approve") {
			req.status = VerificationStatus.VERIFIED;
			await UserModel.updateOne(
				{ id: req.userId },
				{
					$set: {
						verificationStatus: VerificationStatus.VERIFIED,
						verifiedAt: now,
						verificationMethod: VerificationMethod.ADMIN_APPROVED,
					},
				},
			);
		} else if (action === "reject") {
			req.status = VerificationStatus.REJECTED;
			req.rejectionReason = reason;
			await UserModel.updateOne(
				{ id: req.userId },
				{
					$set: {
						verificationStatus: VerificationStatus.REJECTED,
						verificationRejectionReason: reason,
					},
				},
			);
		} else {
			return NextResponse.json(
				{ error: "action must be approve or reject" },
				{ status: 400 },
			);
		}

		await req.save();
		const obj = req.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error reviewing verification:", error);
		return NextResponse.json(
			{ error: "Failed to review verification" },
			{ status: 500 },
		);
	}
}
