import connectDB from "@/lib/mongoose";
import { AIDocumentModel } from "@/models/AIDocument";
import { DocumentAccessRequestModel, PropertyService } from "@/models/Property";
import { AccessRequestStatus, DocumentAccessLevel } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

// GET - List access requests for a property (for the owner) or check request status (for a requester)
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id: propertyId } = await params;
		const { searchParams } = new URL(request.url);
		const requesterId = searchParams.get("requesterId");
		const ownerId = searchParams.get("ownerId");

		const property = await PropertyService.getPropertyById(propertyId);
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		const query: Record<string, string> = { propertyId };

		// If requesterId is provided, filter by requester (viewer checking their own requests)
		if (requesterId) {
			query.requesterId = requesterId;
		}
		// If ownerId is provided, filter by owner (owner viewing incoming requests)
		if (ownerId) {
			query.ownerId = ownerId;
		}

		const requests = await DocumentAccessRequestModel.find(query)
			.sort({ createdAt: -1 })
			.lean();

		const cleaned = requests.map((r: any) => {
			const { _id, __v, ...rest } = r;
			return rest;
		});

		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error fetching access requests:", error);
		return NextResponse.json(
			{ error: "Failed to fetch access requests" },
			{ status: 500 },
		);
	}
}

// POST - Create a new access request
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id: propertyId } = await params;
		const body = await request.json();

		const {
			documentId,
			requesterId,
			requesterName,
			requesterEmail,
			requesterAvatar,
			message,
		} = body;

		if (!documentId || !requesterId || !requesterName || !requesterEmail) {
			return NextResponse.json(
				{
					error:
						"documentId, requesterId, requesterName, and requesterEmail are required",
				},
				{ status: 400 },
			);
		}

		const property = await PropertyService.getPropertyById(propertyId);
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		const document = await AIDocumentModel.findById(documentId)
			.select("accessLevel propertyIds")
			.lean();
		if (!document || !(document.propertyIds ?? []).includes(propertyId)) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		if (!property.owner?.id) {
			return NextResponse.json(
				{ error: "Property owner is not configured" },
				{ status: 400 },
			);
		}

		if (document.accessLevel !== DocumentAccessLevel.REQUEST_REQUIRED) {
			return NextResponse.json(
				{ error: "This document does not require access requests" },
				{ status: 400 },
			);
		}

		// Prevent duplicate pending requests
		const existing = await DocumentAccessRequestModel.findOne({
			propertyId,
			documentId,
			requesterId,
			status: AccessRequestStatus.PENDING,
		}).lean();

		if (existing) {
			return NextResponse.json(
				{ error: "You already have a pending request for this document" },
				{ status: 409 },
			);
		}

		const id = `dar_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

		const accessRequest = await DocumentAccessRequestModel.create({
			id,
			propertyId,
			documentId,
			requesterId,
			requesterName,
			requesterEmail,
			requesterAvatar,
			ownerId: property.owner.id,
			status: AccessRequestStatus.PENDING,
			message: message || undefined,
		});

		const obj = accessRequest.toObject();
		const { _id, __v, ...clean } = obj as any;

		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error creating access request:", error);
		return NextResponse.json(
			{ error: "Failed to create access request" },
			{ status: 500 },
		);
	}
}

// PUT - Approve or deny an access request (by owner)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id: propertyId } = await params;
		const body = await request.json();

		const { requestId, status, responseMessage, ownerId } = body;

		if (!requestId || !status || !ownerId) {
			return NextResponse.json(
				{ error: "requestId, status, and ownerId are required" },
				{ status: 400 },
			);
		}

		if (
			status !== AccessRequestStatus.APPROVED &&
			status !== AccessRequestStatus.DENIED
		) {
			return NextResponse.json(
				{ error: "Status must be 'approved' or 'denied'" },
				{ status: 400 },
			);
		}

		const accessRequest = await DocumentAccessRequestModel.findOne({
			id: requestId,
			propertyId,
		}).lean();

		if (!accessRequest) {
			return NextResponse.json(
				{ error: "Access request not found" },
				{ status: 404 },
			);
		}

		if ((accessRequest as any).ownerId !== ownerId) {
			return NextResponse.json(
				{ error: "Only the property owner can respond to access requests" },
				{ status: 403 },
			);
		}

		const updated = await DocumentAccessRequestModel.findOneAndUpdate(
			{ id: requestId },
			{
				status,
				responseMessage: responseMessage || undefined,
			},
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json(
				{ error: "Failed to update request" },
				{ status: 500 },
			);
		}

		const { _id, __v, ...clean } = updated as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating access request:", error);
		return NextResponse.json(
			{ error: "Failed to update access request" },
			{ status: 500 },
		);
	}
}
