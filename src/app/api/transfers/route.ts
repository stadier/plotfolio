import connectDB from "@/lib/mongoose";
import { OwnershipTransferModel } from "@/models/OwnershipTransfer";
import { NextRequest, NextResponse } from "next/server";

// GET /api/transfers?userId=X — list all transfers involving a user (sent or received)
export async function GET(request: NextRequest) {
	try {
		await connectDB();

		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		const transfers = await OwnershipTransferModel.find({
			$or: [{ fromUserId: userId }, { toUserId: userId }],
		})
			.sort({ createdAt: -1 })
			.lean();

		const cleaned = transfers.map(({ _id, __v, ...rest }: any) => rest);
		return NextResponse.json(cleaned);
	} catch (error) {
		console.error("Error fetching transfers:", error);
		return NextResponse.json(
			{ error: "Failed to fetch transfers" },
			{ status: 500 },
		);
	}
}
