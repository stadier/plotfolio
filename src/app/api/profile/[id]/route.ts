import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { PropertyStatus, PropertyVisibility } from "@/types/property";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;

		const allProperties = await PropertyService.getAllProperties();
		const ownerProperties = allProperties.filter((p) => p.owner?.id === id);

		if (ownerProperties.length === 0) {
			return NextResponse.json({ error: "Owner not found" }, { status: 404 });
		}

		const owner = ownerProperties[0].owner;

		// Public properties: explicitly marked public OR listed (for_sale/for_rent/for_lease implies public)
		const publicProperties = ownerProperties.filter(
			(p) =>
				p.visibility === PropertyVisibility.PUBLIC ||
				p.status === PropertyStatus.FOR_SALE ||
				p.status === PropertyStatus.FOR_RENT ||
				p.status === PropertyStatus.FOR_LEASE,
		);

		const listedCount = ownerProperties.filter(
			(p) =>
				p.status === PropertyStatus.FOR_SALE ||
				p.status === PropertyStatus.FOR_RENT ||
				p.status === PropertyStatus.FOR_LEASE,
		).length;

		// Derive portfolio stats from ALL properties
		const totalValue = ownerProperties.reduce(
			(sum, p) => sum + (p.currentValue || p.purchasePrice || 0),
			0,
		);
		const totalArea = ownerProperties.reduce(
			(sum, p) => sum + (p.area || 0),
			0,
		);

		return NextResponse.json({
			owner,
			stats: {
				totalProperties: ownerProperties.length,
				publicCount: publicProperties.length,
				listedCount,
				totalValue,
				totalArea,
				salesCount: owner.salesCount ?? 0,
			},
			properties: publicProperties,
		});
	} catch (error) {
		console.error("Error fetching profile:", error);
		return NextResponse.json(
			{ error: "Failed to fetch profile" },
			{ status: 500 },
		);
	}
}
