import { sendBookingStatusEmail } from "@/lib/email";
import connectDB from "@/lib/mongoose";
import { BookingModel } from "@/models/Booking";
import { PropertyModel } from "@/models/Property";
import { UserModel } from "@/models/User";
import { BookingStatus, BookingType } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
	[BookingType.INSPECTION]: "Inspection",
	[BookingType.SITE_VISIT]: "Site Visit",
	[BookingType.CONSULTATION]: "Consultation",
	[BookingType.INQUIRY]: "Inquiry",
	[BookingType.VALUATION]: "Valuation",
	[BookingType.NEGOTIATION]: "Negotiation",
	[BookingType.OTHER]: "Other",
};

const STATUS_TO_EMAIL: Partial<
	Record<BookingStatus, "confirmed" | "declined" | "rescheduled" | "completed">
> = {
	[BookingStatus.CONFIRMED]: "confirmed",
	[BookingStatus.CANCELLED]: "declined",
	[BookingStatus.RESCHEDULED]: "rescheduled",
	[BookingStatus.COMPLETED]: "completed",
};

// PATCH /api/bookings/[id] — update booking status (confirm, cancel, complete, reschedule)
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();

		const { id } = await params;
		const body = await request.json();
		const {
			status,
			ownerMessage,
			proposedDate,
			proposedTime,
			initiatedBy, // "owner" (default) | "requester"
		} = body;

		if (!status || !Object.values(BookingStatus).includes(status)) {
			return NextResponse.json(
				{
					error: `Invalid status. Must be one of: ${Object.values(BookingStatus).join(", ")}`,
				},
				{ status: 400 },
			);
		}

		const update: Record<string, unknown> = { status };
		if (ownerMessage !== undefined) update.ownerMessage = ownerMessage;
		if (status === BookingStatus.RESCHEDULED) {
			if (!proposedDate || !proposedTime) {
				return NextResponse.json(
					{
						error: "proposedDate and proposedTime are required for reschedule",
					},
					{ status: 400 },
				);
			}
			update.proposedDate = proposedDate;
			update.proposedTime = proposedTime;
		}

		const updated = await BookingModel.findOneAndUpdate({ id }, update, {
			new: true,
		}).lean();

		if (!updated) {
			return NextResponse.json({ error: "Booking not found" }, { status: 404 });
		}

		const { _id, __v, ...cleaned } = updated as any;

		// Notify the requester via email when the owner takes action.
		// Skip when the requester themselves performs the change (e.g. self-cancel).
		const emailStatus = STATUS_TO_EMAIL[status as BookingStatus];
		if (emailStatus && initiatedBy !== "requester") {
			(async () => {
				try {
					const [property, ownerUser] = await Promise.all([
						cleaned.propertyId
							? PropertyModel.findOne({ id: cleaned.propertyId })
									.select("name owner")
									.lean<{
										name?: string;
										owner?: { email?: string; name?: string };
									}>()
							: Promise.resolve(null),
						UserModel.findOne({ id: cleaned.ownerId })
							.select("email name displayName")
							.lean<{ email?: string; name?: string; displayName?: string }>(),
					]);

					const ownerName =
						ownerUser?.displayName ||
						ownerUser?.name ||
						property?.owner?.name ||
						"The owner";

					await sendBookingStatusEmail({
						to: cleaned.requesterEmail,
						recipientName: cleaned.requesterName,
						requesterName: cleaned.requesterName,
						requesterEmail: cleaned.requesterEmail,
						propertyName: property?.name || "the property",
						bookingType:
							BOOKING_TYPE_LABELS[cleaned.type as BookingType] ??
							String(cleaned.type),
						date: cleaned.date,
						time: cleaned.time,
						status: emailStatus,
						ownerName,
						ownerMessage: cleaned.ownerMessage || undefined,
						proposedDate: cleaned.proposedDate || undefined,
						proposedTime: cleaned.proposedTime || undefined,
					});
				} catch (mailErr) {
					console.error(
						"[bookings] Failed to send requester status email:",
						mailErr,
					);
				}
			})();
		}

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
