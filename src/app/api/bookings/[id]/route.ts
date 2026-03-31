import connectDB from "@/lib/mongoose";
import { BookingModel } from "@/models/Booking";
import { BookingStatus } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/bookings/[id] — update booking status (confirm, cancel, complete)
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();

		const { id } = await params;
		const body = await request.json();
		const { status } = body;

		if (!status || !Object.values(BookingStatus).includes(status)) {
			return NextResponse.json(
				{
					error: `Invalid status. Must be one of: ${Object.values(BookingStatus).join(", ")}`,
				},
				{ status: 400 },
			);
		}

		const updated = await BookingModel.findOneAndUpdate(
			{ id },
			{ status },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json({ error: "Booking not found" }, { status: 404 });
		}

		const { _id, __v, ...cleaned } = updated as any;

		return NextResponse.json({ booking: cleaned });
	} catch (error) {
		console.error("Error updating booking:", error);
		return NextResponse.json(
			{ error: "Failed to update booking" },
			{ status: 500 },
		);
	}
}

// GET /api/bookings/[id] — get a single booking
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();

		const { id } = await params;
		const booking = await BookingModel.findOne({ id }).lean();

		if (!booking) {
			return NextResponse.json({ error: "Booking not found" }, { status: 404 });
		}

		const { _id, __v, ...cleaned } = booking as any;

		return NextResponse.json({ booking: cleaned });
	} catch (error) {
		console.error("Error fetching booking:", error);
		return NextResponse.json(
			{ error: "Failed to fetch booking" },
			{ status: 500 },
		);
	}
}
