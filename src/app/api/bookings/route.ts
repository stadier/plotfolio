import { sendBookingRequestEmail } from "@/lib/email";
import connectDB from "@/lib/mongoose";
import { BookingModel } from "@/models/Booking";
import { PropertyModel } from "@/models/Property";
import { UserModel } from "@/models/User";
import { BookingStatus, BookingType } from "@/types/property";
import crypto from "crypto";
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

function formatBookingType(type: BookingType | string): string {
	return BOOKING_TYPE_LABELS[type as BookingType] ?? String(type);
}

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

		// Hydrate property + owner display info so the bookings page can
		// render meaningful context (especially for outgoing requests).
		const propertyIds = Array.from(
			new Set(bookings.map((b: any) => b.propertyId).filter(Boolean)),
		);
		const ownerIds = Array.from(
			new Set(bookings.map((b: any) => b.ownerId).filter(Boolean)),
		);

		const [properties, owners] = await Promise.all([
			propertyIds.length
				? PropertyModel.find({ id: { $in: propertyIds } })
						.select("id name address images owner")
						.lean()
				: Promise.resolve([] as any[]),
			ownerIds.length
				? UserModel.find({ id: { $in: ownerIds } })
						.select("id name displayName email avatar")
						.lean()
				: Promise.resolve([] as any[]),
		]);

		const propMap = new Map(properties.map((p: any) => [p.id, p]));
		const ownerMap = new Map(owners.map((u: any) => [u.id, u]));

		const cleaned = bookings.map(({ _id, __v, ...rest }: any) => {
			const prop = rest.propertyId ? propMap.get(rest.propertyId) : null;
			const ownerUser = rest.ownerId ? ownerMap.get(rest.ownerId) : null;
			return {
				...rest,
				property: prop
					? {
							id: prop.id,
							name: prop.name,
							address: prop.address,
							image:
								Array.isArray(prop.images) && prop.images.length
									? prop.images[0]
									: undefined,
						}
					: undefined,
				ownerInfo: ownerUser
					? {
							id: ownerUser.id,
							name: ownerUser.displayName || ownerUser.name,
							email: ownerUser.email,
							avatar: ownerUser.avatar,
						}
					: prop?.owner
						? {
								id: prop.owner.id,
								name: prop.owner.displayName || prop.owner.name,
								email: prop.owner.email,
								avatar: prop.owner.avatar,
							}
						: undefined,
			};
		});

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
			ownerId: rawOwnerId,
			requesterId,
			requesterName,
			requesterEmail,
			requesterPhone,
			type,
			date,
			time,
			message,
			propertyId,
		} = body;

		// Validate required fields
		if (
			!rawOwnerId ||
			!requesterName ||
			!requesterEmail ||
			!type ||
			!date ||
			!time
		) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: ownerId, requesterName, requesterEmail, type, date, time",
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

		// Resolve the canonical owner user. The property's `owner.id` snapshot
		// can drift from the real user `id` (e.g. seed/recreated accounts), so
		// we prefer a User row matched by id, then by email from the property
		// snapshot. This ensures the booking shows up on the owner's dashboard
		// even when the snapshot id is stale.
		let propertySnapshot: {
			name?: string;
			owner?: { id?: string; email?: string; name?: string };
		} | null = null;
		if (propertyId) {
			propertySnapshot = await PropertyModel.findOne({ id: propertyId })
				.select("name owner")
				.lean<{
					name?: string;
					owner?: { id?: string; email?: string; name?: string };
				}>();
		}

		let ownerUser = await UserModel.findOne({ id: rawOwnerId })
			.select("id email name displayName")
			.lean<{
				id: string;
				email?: string;
				name?: string;
				displayName?: string;
			}>();

		if (!ownerUser && propertySnapshot?.owner?.email) {
			ownerUser = await UserModel.findOne({
				email: propertySnapshot.owner.email,
			})
				.select("id email name displayName")
				.lean<{
					id: string;
					email?: string;
					name?: string;
					displayName?: string;
				}>();
		}

		const ownerId = ownerUser?.id || rawOwnerId;

		const booking = await BookingModel.create({
			id: crypto.randomUUID(),
			ownerId,
			requesterId: requesterId || undefined,
			requesterName,
			requesterEmail,
			requesterPhone: requesterPhone || undefined,
			type,
			date,
			time,
			message: message || undefined,
			propertyId: propertyId || undefined,
			status: BookingStatus.PENDING,
		});

		const { _id, __v, ...cleaned } = booking.toObject() as any;

		// Notify the property owner via email (best-effort; never blocks response)
		(async () => {
			try {
				const ownerEmail = ownerUser?.email || propertySnapshot?.owner?.email;
				const ownerName =
					ownerUser?.displayName ||
					ownerUser?.name ||
					propertySnapshot?.owner?.name ||
					"there";

				if (!ownerEmail) {
					console.warn(
						"[bookings] No owner email found for ownerId",
						ownerId,
						"— skipping notification email",
					);
					return;
				}

				await sendBookingRequestEmail({
					to: ownerEmail,
					recipientName: ownerName,
					requesterName,
					requesterEmail,
					propertyName: propertySnapshot?.name || "your property",
					bookingType: formatBookingType(type),
					date,
					time,
					message: message || undefined,
				});
			} catch (mailErr) {
				console.error("[bookings] Failed to send owner notification:", mailErr);
			}
		})();

		return NextResponse.json({ booking: cleaned }, { status: 201 });
	} catch (error) {
		console.error("Error creating booking:", error);
		return NextResponse.json(
			{ error: "Failed to create booking" },
			{ status: 500 },
		);
	}
}
