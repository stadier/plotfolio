import connectDB from "@/lib/mongoose";
import { FollowModel } from "@/models/Follow";
import { PropertyModel } from "@/models/Property";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// GET /api/follow?followerId=X&followingId=Y — check if following
export async function GET(request: NextRequest) {
	try {
		await connectDB();

		const { searchParams } = new URL(request.url);
		const followerId = searchParams.get("followerId");
		const followingId = searchParams.get("followingId");

		if (!followerId || !followingId) {
			return NextResponse.json(
				{ error: "followerId and followingId are required" },
				{ status: 400 },
			);
		}

		const existing = await FollowModel.findOne({
			followerId,
			followingId,
		}).lean();

		return NextResponse.json({ isFollowing: !!existing });
	} catch (error) {
		console.error("Error checking follow status:", error);
		return NextResponse.json(
			{ error: "Failed to check follow status" },
			{ status: 500 },
		);
	}
}

// POST /api/follow — toggle follow/unfollow
export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const body = await request.json();
		const { followerId, followingId } = body;

		if (!followerId || !followingId) {
			return NextResponse.json(
				{ error: "followerId and followingId are required" },
				{ status: 400 },
			);
		}

		if (followerId === followingId) {
			return NextResponse.json(
				{ error: "Cannot follow yourself" },
				{ status: 400 },
			);
		}

		const existing = await FollowModel.findOne({ followerId, followingId });

		if (existing) {
			// Unfollow
			await FollowModel.deleteOne({ followerId, followingId });
			// Decrement follower count
			await PropertyModel.updateMany(
				{ "owner.id": followingId },
				{ $inc: { "owner.followerCount": -1 } },
			);

			const updated = await PropertyModel.findOne({
				"owner.id": followingId,
			}).lean();
			const newCount = (updated as any)?.owner?.followerCount ?? 0;

			return NextResponse.json({
				action: "unfollowed",
				isFollowing: false,
				followerCount: Math.max(0, newCount),
			});
		} else {
			// Follow
			await FollowModel.create({
				id: crypto.randomUUID(),
				followerId,
				followingId,
			});
			// Increment follower count
			await PropertyModel.updateMany(
				{ "owner.id": followingId },
				{ $inc: { "owner.followerCount": 1 } },
			);

			const updated = await PropertyModel.findOne({
				"owner.id": followingId,
			}).lean();
			const newCount = (updated as any)?.owner?.followerCount ?? 0;

			return NextResponse.json({
				action: "followed",
				isFollowing: true,
				followerCount: newCount,
			});
		}
	} catch (error) {
		console.error("Error toggling follow:", error);
		return NextResponse.json(
			{ error: "Failed to toggle follow" },
			{ status: 500 },
		);
	}
}
