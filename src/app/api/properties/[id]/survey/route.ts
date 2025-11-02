import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();
		const surveyData = await request.json();
		const updated = await PropertyService.updateSurveyData(
			params.id,
			surveyData
		);

		if (!updated) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error updating survey data:", error);
		return NextResponse.json(
			{ error: "Failed to update survey data" },
			{ status: 500 }
		);
	}
}
