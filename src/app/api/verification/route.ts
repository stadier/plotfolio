/**
 * User-facing verification submission.
 *
 * POST /api/verification — submit a request (and optionally an ID document URL)
 * GET /api/verification — get the current user's verification status / latest request
 */

import connectDB from "@/lib/mongoose";
import { getPlatformSettings } from "@/lib/saleService";
import { getSessionUser } from "@/lib/session";
import { VerificationRequestModel } from "@/models/Sale";
import { UserModel } from "@/models/User";
import { VerificationMethod, VerificationStatus } from "@/types/sale";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		await connectDB();
		const latest = await VerificationRequestModel.findOne({ userId: user.id })
			.sort({ createdAt: -1 })
			.lean<any>();

		return NextResponse.json({
			status: user.verificationStatus ?? VerificationStatus.UNVERIFIED,
			verifiedAt: user.verifiedAt,
			method: user.verificationMethod,
			rejectionReason: user.verificationRejectionReason,
			latestRequest: latest
				? (() => {
						const { _id, __v, ...clean } = latest;
						return clean;
					})()
				: null,
		});
	} catch (error) {
		console.error("Error fetching verification status:", error);
		return NextResponse.json(
			{ error: "Failed to fetch verification status" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { documentUrl, documentType, notes } = await request.json();

		await connectDB();

		const req = await VerificationRequestModel.create({
			id: crypto.randomUUID(),
			userId: user.id,
			userName: user.displayName ?? user.name,
			userEmail: user.email,
			documentUrl,
			documentType,
			notes,
			submittedAt: new Date().toISOString(),
			status: VerificationStatus.PENDING,
		});

		// Flip user status to PENDING
		const updates: Record<string, unknown> = {
			verificationStatus: VerificationStatus.PENDING,
			verificationDocumentUrl: documentUrl,
			verificationDocumentType: documentType,
			verificationNotes: notes,
		};

		// Auto-approve toggle (admin-controlled)
		const settings = await getPlatformSettings();
		if (settings.autoApproveVerifications) {
			updates.verificationStatus = VerificationStatus.VERIFIED;
			updates.verifiedAt = new Date().toISOString();
			updates.verificationMethod = VerificationMethod.MANUAL;
			req.status = VerificationStatus.VERIFIED;
			req.reviewedAt = new Date().toISOString();
			await req.save();
		}

		await UserModel.updateOne({ id: user.id }, { $set: updates });

		const obj = req.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error submitting verification:", error);
		return NextResponse.json(
			{ error: "Failed to submit verification" },
			{ status: 500 },
		);
	}
}
