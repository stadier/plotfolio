import connectDB from "@/lib/mongoose";
import { DocumentAccessRequestModel } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

// GET /api/document-requests?ownerId=xxx - Get all access requests for an owner
// GET /api/document-requests?requesterId=xxx - Get all requests made by a user
export async function GET(request: NextRequest) {
	try {
		await connectDB();

		const { searchParams } = new URL(request.url);
		const ownerId = searchParams.get("ownerId");
		const requesterId = searchParams.get("requesterId");

		if (!ownerId && !requesterId) {
			return NextResponse.json(
				{ error: "ownerId or requesterId is required" },
				{ status: 400 },
			);
		}

		const query: Record<string, string> = {};
		if (ownerId) query.ownerId = ownerId;
		if (requesterId) query.requesterId = requesterId;

		const requests = await DocumentAccessRequestModel.find(query)
			.sort({ createdAt: -1 })
			.lean();

		const cleaned = requests.map((r: any) => {
			const { _id, __v, ...rest } = r;
			return rest;
		});

		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error fetching document requests:", error);
		return NextResponse.json(
			{ error: "Failed to fetch document requests" },
			{ status: 500 },
		);
	}
}
