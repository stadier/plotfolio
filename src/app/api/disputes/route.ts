/**
 * Disputes API.
 *
 * Stub implementation — supports raise + list. The full evidence/admin
 * arbitration flow is tracked in TODOS.
 */

import connectDB from "@/lib/mongoose";
import { getSessionUser } from "@/lib/session";
import { DisputeModel, SaleModel } from "@/models/Sale";
import { DisputeStatus, DisputeType, SaleStatus } from "@/types/sale";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		await connectDB();
		const { searchParams } = new URL(request.url);
		const saleId = searchParams.get("saleId");
		const propertyId = searchParams.get("propertyId");

		const filter: Record<string, unknown> = {};
		if (saleId) filter.saleId = saleId;
		if (propertyId) filter.propertyId = propertyId;

		// Non-admins only see disputes they're a party to
		if (!user.isAdmin) {
			filter.$or = [{ raisedById: user.id }, { againstUserId: user.id }];
		}

		const disputes = await DisputeModel.find(filter)
			.sort({ createdAt: -1 })
			.lean();
		const cleaned = disputes.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error listing disputes:", error);
		return NextResponse.json(
			{ error: "Failed to list disputes" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await getSessionUser();
		if (!user)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const {
			saleId,
			offerId,
			propertyId,
			againstUserId,
			againstName,
			type,
			description,
			evidence,
		} = await request.json();

		if (!type || !Object.values(DisputeType).includes(type)) {
			return NextResponse.json(
				{ error: "Valid dispute type required" },
				{ status: 400 },
			);
		}
		if (!description || typeof description !== "string") {
			return NextResponse.json(
				{ error: "description is required" },
				{ status: 400 },
			);
		}

		await connectDB();

		const dispute = await DisputeModel.create({
			id: crypto.randomUUID(),
			saleId,
			offerId,
			propertyId,
			raisedById: user.id,
			raisedByName: user.displayName ?? user.name,
			againstUserId,
			againstName,
			type,
			status: DisputeStatus.OPEN,
			description,
			evidence: Array.isArray(evidence) ? evidence : [],
		});

		// Flag the linked Sale as disputed
		if (saleId) {
			await SaleModel.updateOne(
				{ id: saleId },
				{ $set: { status: SaleStatus.DISPUTED } },
			);
		}

		const obj = dispute.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error creating dispute:", error);
		return NextResponse.json(
			{ error: "Failed to create dispute" },
			{ status: 500 },
		);
	}
}
