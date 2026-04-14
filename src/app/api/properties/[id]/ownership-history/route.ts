import connectDB from "@/lib/mongoose";
import { OwnershipRecordModel } from "@/models/OwnershipRecord";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/ownership-history — list all ownership records
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;

		const records = await OwnershipRecordModel.find({ propertyId: id })
			.sort({ acquiredDate: 1, createdAt: 1 })
			.lean();

		const cleaned = records.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error fetching ownership history:", error);
		return NextResponse.json(
			{ error: "Failed to fetch ownership history" },
			{ status: 500 },
		);
	}
}

// POST /api/properties/[id]/ownership-history — add a historical ownership record (external / pre-platform)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const body = await request.json();

		const {
			ownerName,
			ownerEmail,
			ownerType,
			acquiredDate,
			transferredDate,
			acquisitionMethod,
			price,
			notes,
		} = body;

		if (!ownerName || !ownerType || !acquisitionMethod) {
			return NextResponse.json(
				{ error: "ownerName, ownerType, and acquisitionMethod are required" },
				{ status: 400 },
			);
		}

		const record = await OwnershipRecordModel.create({
			id: crypto.randomUUID(),
			propertyId: id,
			ownerName,
			ownerEmail: ownerEmail || undefined,
			ownerType,
			acquiredDate: acquiredDate || undefined,
			transferredDate: transferredDate || undefined,
			acquisitionMethod,
			price: price || 0,
			notes: notes || undefined,
		});

		const obj = record.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error creating ownership record:", error);
		return NextResponse.json(
			{ error: "Failed to create ownership record" },
			{ status: 500 },
		);
	}
}

// PUT /api/properties/[id]/ownership-history — update an existing record
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const body = await request.json();

		const { recordId, ...updates } = body;

		if (!recordId) {
			return NextResponse.json(
				{ error: "recordId is required" },
				{ status: 400 },
			);
		}

		const updated = await OwnershipRecordModel.findOneAndUpdate(
			{ id: recordId, propertyId: id },
			updates,
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json({ error: "Record not found" }, { status: 404 });
		}

		const { _id, __v, ...clean } = updated as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating ownership record:", error);
		return NextResponse.json(
			{ error: "Failed to update ownership record" },
			{ status: 500 },
		);
	}
}

// DELETE /api/properties/[id]/ownership-history — remove a record
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;

		const { searchParams } = new URL(request.url);
		const recordId = searchParams.get("recordId");

		if (!recordId) {
			return NextResponse.json(
				{ error: "recordId query param is required" },
				{ status: 400 },
			);
		}

		const result = await OwnershipRecordModel.deleteOne({
			id: recordId,
			propertyId: id,
		});

		if (result.deletedCount === 0) {
			return NextResponse.json({ error: "Record not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting ownership record:", error);
		return NextResponse.json(
			{ error: "Failed to delete ownership record" },
			{ status: 500 },
		);
	}
}
