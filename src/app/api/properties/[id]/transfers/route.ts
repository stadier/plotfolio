import connectDB from "@/lib/mongoose";
import { OwnershipRecordModel } from "@/models/OwnershipRecord";
import { OwnershipTransferModel } from "@/models/OwnershipTransfer";
import { PortfolioMemberModel } from "@/models/Portfolio";
import { PropertyModel } from "@/models/Property";
import { UserModel } from "@/models/User";
import { PortfolioMemberStatus, TransferStatus } from "@/types/property";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// GET /api/properties/[id]/transfers — list transfers for a property
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;

		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		// If userId is provided, return transfers involving this user for this property
		const filter: Record<string, unknown> = { propertyId: id };
		if (userId) {
			filter.$or = [{ fromUserId: userId }, { toUserId: userId }];
		}

		const transfers = await OwnershipTransferModel.find(filter)
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

// POST /api/properties/[id]/transfers — initiate a new ownership transfer
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const body = await request.json();

		const {
			fromUserId,
			toEmail,
			toUsername,
			toName,
			message,
			transferDate,
			price,
		} = body;

		if (!fromUserId || !toName) {
			return NextResponse.json(
				{ error: "fromUserId and toName are required" },
				{ status: 400 },
			);
		}

		if (!toEmail && !toUsername) {
			return NextResponse.json(
				{
					error:
						"Provide either toEmail or toUsername to identify the recipient",
				},
				{ status: 400 },
			);
		}

		// Verify property exists and caller is the owner
		const property = await PropertyModel.findOne({ id }).lean();
		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		const propOwner = (property as any).owner;
		if (!propOwner || propOwner.id !== fromUserId) {
			return NextResponse.json(
				{ error: "Only the property owner can initiate a transfer" },
				{ status: 403 },
			);
		}

		// Check no pending transfer already exists for this property
		const existing = await OwnershipTransferModel.findOne({
			propertyId: id,
			status: TransferStatus.PENDING,
		});
		if (existing) {
			return NextResponse.json(
				{ error: "A pending transfer already exists for this property" },
				{ status: 409 },
			);
		}

		// Look up recipient on the platform by username or email
		let recipient = null;
		if (toUsername) {
			const cleanUsername = toUsername.replace(/^@/, "");
			recipient = await UserModel.findOne({ username: cleanUsername }).lean();
		}
		if (!recipient && toEmail) {
			recipient = await UserModel.findOne({ email: toEmail }).lean();
		}
		const recipientUser = recipient as any;

		const resolvedEmail = toEmail || recipientUser?.email || "";

		const transfer = await OwnershipTransferModel.create({
			id: crypto.randomUUID(),
			propertyId: id,
			propertyName: (property as any).name,
			fromUserId,
			fromName: propOwner.name,
			fromEmail: propOwner.email,
			fromAvatar: propOwner.avatar,
			toUserId: recipientUser?.id || undefined,
			toName,
			toEmail: resolvedEmail,
			toAvatar: recipientUser?.avatar || undefined,
			status: TransferStatus.PENDING,
			message: message || undefined,
			transferDate: transferDate || new Date().toISOString(),
			price: price || 0,
		});

		const obj = transfer.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean, { status: 201 });
	} catch (error) {
		console.error("Error creating transfer:", error);
		return NextResponse.json(
			{ error: "Failed to create transfer" },
			{ status: 500 },
		);
	}
}

// PUT /api/properties/[id]/transfers — respond to or cancel a transfer
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const body = await request.json();

		const { transferId, action, userId, responseMessage } = body;

		if (!transferId || !action || !userId) {
			return NextResponse.json(
				{ error: "transferId, action, and userId are required" },
				{ status: 400 },
			);
		}

		const transfer = await OwnershipTransferModel.findOne({
			id: transferId,
			propertyId: id,
		});

		if (!transfer) {
			return NextResponse.json(
				{ error: "Transfer not found" },
				{ status: 404 },
			);
		}

		if (transfer.status !== TransferStatus.PENDING) {
			return NextResponse.json(
				{ error: "Transfer is no longer pending" },
				{ status: 400 },
			);
		}

		switch (action) {
			case "accept": {
				// Only recipient can accept
				if (transfer.toUserId && transfer.toUserId !== userId) {
					return NextResponse.json(
						{ error: "Only the recipient can accept the transfer" },
						{ status: 403 },
					);
				}

				transfer.status = TransferStatus.ACCEPTED;
				transfer.responseMessage = responseMessage || undefined;
				await transfer.save();

				// Now complete the transfer — update property ownership
				const recipientUser = transfer.toUserId
					? await UserModel.findOne({ id: transfer.toUserId }).lean()
					: null;
				const ru = recipientUser as any;

				if (ru) {
					// Find the recipient's personal portfolio
					const membership = await PortfolioMemberModel.findOne({
						userId: ru.id,
						status: PortfolioMemberStatus.ACTIVE,
						role: "admin",
					}).lean();

					await PropertyModel.findOneAndUpdate(
						{ id },
						{
							owner: {
								id: ru.id,
								name: ru.name,
								username: ru.username,
								displayName: ru.displayName,
								avatar: ru.avatar,
								banner: ru.banner,
								email: ru.email,
								phone: ru.phone,
								type: ru.type,
								joinDate: ru.joinDate,
								salesCount: ru.salesCount || 0,
								followerCount: ru.followerCount || 0,
								allowBookings: ru.allowBookings || false,
							},
							...(membership
								? { portfolioId: (membership as any).portfolioId }
								: {}),
						},
					);
				}

				// Mark transfer complete
				transfer.status = TransferStatus.COMPLETED;
				await transfer.save();

				// Create ownership history records
				const now = new Date().toISOString();

				// Close the previous owner's record
				await OwnershipRecordModel.findOneAndUpdate(
					{
						propertyId: id,
						ownerId: transfer.fromUserId,
						transferredDate: { $exists: false },
					},
					{ transferredDate: now },
				);

				// Create record for new owner
				await OwnershipRecordModel.create({
					id: crypto.randomUUID(),
					propertyId: id,
					ownerId: transfer.toUserId || undefined,
					ownerName: transfer.toName,
					ownerEmail: transfer.toEmail,
					ownerAvatar: transfer.toAvatar,
					ownerType: ru?.type || "individual",
					acquiredDate: now,
					acquisitionMethod: transfer.price ? "purchase" : "transfer",
					price: transfer.price || 0,
					transferId: transfer.id,
				});

				break;
			}

			case "reject": {
				// Only recipient can reject
				if (transfer.toUserId && transfer.toUserId !== userId) {
					return NextResponse.json(
						{ error: "Only the recipient can reject the transfer" },
						{ status: 403 },
					);
				}
				transfer.status = TransferStatus.REJECTED;
				transfer.responseMessage = responseMessage || undefined;
				await transfer.save();
				break;
			}

			case "cancel": {
				// Only sender can cancel
				if (transfer.fromUserId !== userId) {
					return NextResponse.json(
						{ error: "Only the sender can cancel the transfer" },
						{ status: 403 },
					);
				}
				transfer.status = TransferStatus.CANCELLED;
				await transfer.save();
				break;
			}

			default:
				return NextResponse.json(
					{ error: "action must be accept, reject, or cancel" },
					{ status: 400 },
				);
		}

		const obj = transfer.toObject();
		const { _id, __v, ...clean } = obj as any;
		return NextResponse.json(clean);
	} catch (error) {
		console.error("Error updating transfer:", error);
		return NextResponse.json(
			{ error: "Failed to update transfer" },
			{ status: 500 },
		);
	}
}
