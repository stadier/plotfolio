import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const ownerId = searchParams.get("ownerId");
		const portfolioId = searchParams.get("portfolioId");
		let properties = await PropertyService.getAllProperties();
		if (ownerId && portfolioId) {
			// Own portfolio: match by portfolio OR by ownership (handles stale portfolioId)
			properties = properties.filter(
				(p) => p.portfolioId === portfolioId || p.owner?.id === ownerId,
			);
		} else if (portfolioId) {
			properties = properties.filter((p) => p.portfolioId === portfolioId);
		} else if (ownerId) {
			properties = properties.filter((p) => p.owner?.id === ownerId);
		}
		const filtered = status
			? (() => {
					const statuses = status.split(",");
					return properties.filter((p) => statuses.includes(p.status));
				})()
			: properties;
		return NextResponse.json(filtered);
	} catch (error) {
		console.error("Error fetching properties:", error);
		return NextResponse.json(
			{ error: "Failed to fetch properties" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const property = await request.json();
		const created = await PropertyService.createProperty(property);
		return NextResponse.json(created, { status: 201 });
	} catch (error) {
		console.error("Error creating property:", error);
		return NextResponse.json(
			{ error: "Failed to create property" },
			{ status: 500 },
		);
	}
}
