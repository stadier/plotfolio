import connectDB from "@/lib/mongoose";
import { BookingModel } from "@/models/Booking";
import { BookingStatus, BookingType } from "@/types/property";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// GET /api/bookings?ownerId=X or ?requesterId=X — list bookings
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

		const filter: Record<string, string> = {};
		if (ownerId) filter.ownerId = ownerId;
		if (requesterId) filter.requesterId = requesterId;

		const bookings = await BookingModel.find(filter)
			.sort({ createdAt: -1 })
			.lean();

		const cleaned = bookings.map(({ _id, __v, ...rest }: any) => rest);

		return NextResponse.json({ bookings: cleaned });
	} catch (error) {
		console.error("Error fetching bookings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch bookings" },
			{ status: 500 },
		);
	}
}

// POST /api/bookings — create a new booking request
export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const body = await request.json();
		const {
			ownerId,
			requesterId,
			requesterName,
			requesterEmail,
			type,
			date,
			time,
			message,
			propertyId,
		} = body;

		// Validate required fields
		if (
			!ownerId ||
			!requesterId ||
			!requesterName ||
			!requesterEmail ||
			!type ||
			!date ||
			!time
		) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: ownerId, requesterId, requesterName, requesterEmail, type, date, time",
				},
				{ status: 400 },
			);
		}

		// Validate booking type
		if (!Object.values(BookingType).includes(type)) {
			return NextResponse.json(
				{
					error: `Invalid booking type. Must be one of: ${Object.values(BookingType).join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Validate date is not in the past
		const bookingDate = new Date(`${date}T${time}`);
		if (isNaN(bookingDate.getTime())) {
			return NextResponse.json(
				{ error: "Invalid date or time format" },
				{ status: 400 },
			);
		}
		if (bookingDate < new Date()) {
			return NextResponse.json(
				{ error: "Booking date must be in the future" },
				{ status: 400 },
			);
		}

		const booking = await BookingModel.create({
			id: crypto.randomUUID(),
			ownerId,
			requesterId,
			requesterName,
			requesterEmail,
			type,
			date,
			time,
			message: message || undefined,
			propertyId: propertyId || undefined,
			status: BookingStatus.PENDING,
		});

		const { _id, __v, ...cleaned } = booking.toObject() as any;

		return NextResponse.json({ booking: cleaned }, { status: 201 });
	} catch (error) {
		console.error("Error creating booking:", error);
		return NextResponse.json(
			{ error: "Failed to create booking" },
			{ status: 500 },
		);
	}
}
