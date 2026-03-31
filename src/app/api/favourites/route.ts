import connectDB from "@/lib/mongoose";
import { FavouriteModel } from "@/models/Favourite";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// GET /api/favourites?userId=X — get all favourites for a user
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

		const favourites = await FavouriteModel.find({ userId })
			.sort({ createdAt: -1 })
			.lean();

		return NextResponse.json({
			propertyIds: favourites.map((f) => f.propertyId),
		});
	} catch (error) {
		console.error("Error fetching favourites:", error);
		return NextResponse.json(
			{ error: "Failed to fetch favourites" },
			{ status: 500 },
		);
	}
}

// POST /api/favourites — toggle favourite or bulk-sync
export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const body = await request.json();

		// Bulk sync: { userId, propertyIds: string[] }
		if (Array.isArray(body.propertyIds)) {
			const { userId, propertyIds } = body;
			if (!userId || !propertyIds) {
				return NextResponse.json(
					{ error: "userId and propertyIds are required" },
					{ status: 400 },
				);
			}

			// Get existing favourites
			const existing = await FavouriteModel.find({ userId }).lean();
			const existingIds = new Set(existing.map((f) => f.propertyId));

			// Add new ones that don't already exist
			const toInsert = propertyIds
				.filter((pid: string) => !existingIds.has(pid))
				.map((pid: string) => ({
					id: crypto.randomUUID(),
					userId,
					propertyId: pid,
				}));

			if (toInsert.length > 0) {
				await FavouriteModel.insertMany(toInsert);
			}

			// Return merged set
			const merged = await FavouriteModel.find({ userId }).lean();
			return NextResponse.json({
				propertyIds: merged.map((f) => f.propertyId),
			});
		}

		// Single toggle: { userId, propertyId }
		const { userId, propertyId } = body;
		if (!userId || !propertyId) {
			return NextResponse.json(
				{ error: "userId and propertyId are required" },
				{ status: 400 },
			);
		}

		const existing = await FavouriteModel.findOne({ userId, propertyId });

		if (existing) {
			await FavouriteModel.deleteOne({ userId, propertyId });
			return NextResponse.json({ action: "removed", isFavourite: false });
		}

		await FavouriteModel.create({
			id: crypto.randomUUID(),
			userId,
			propertyId,
		});
		return NextResponse.json({ action: "added", isFavourite: true });
	} catch (error) {
		console.error("Error toggling favourite:", error);
		return NextResponse.json(
			{ error: "Failed to toggle favourite" },
			{ status: 500 },
		);
	}
}
