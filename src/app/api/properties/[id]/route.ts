import { b2, B2_BUCKET } from "@/lib/b2";
import { CacheControl } from "@/lib/httpCache";
import connectDB from "@/lib/mongoose";
import { PropertyService } from "@/models/Property";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

/**
 * Upload a base64 data-URL signature image to B2 and return the public URL.
 */
async function uploadSignatureToB2(
	propertyId: string,
	base64DataUrl: string,
	label: string,
): Promise<string> {
	const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
	if (!match) throw new Error("Invalid base64 data URL");

	const contentType = match[1];
	const ext = contentType.split("/")[1]; // png, jpeg, etc.
	const buffer = Buffer.from(match[2], "base64");
	const safeName = label.replace(/[^a-zA-Z0-9._\-]/g, "_");
	const key = `uploads/${propertyId}/signatures/${Date.now()}_${safeName}.${ext}`;

	await b2.send(
		new PutObjectCommand({
			Bucket: B2_BUCKET,
			Key: key,
			Body: buffer,
			ContentType: contentType,
		}),
	);

	return `https://${B2_BUCKET}.s3.us-east-005.backblazeb2.com/${key}`;
}

/**
 * For an array of {name, signature} entries, upload any base64 signatures
 * to B2 storage and replace them with the resulting URLs.
 */
async function processSignatureEntries(
	propertyId: string,
	entries: { name: string; signature: string }[],
	kind: string,
): Promise<{ name: string; signature: string }[]> {
	return Promise.all(
		entries.map(async (entry) => {
			if (entry.signature?.startsWith("data:image/")) {
				const url = await uploadSignatureToB2(
					propertyId,
					entry.signature,
					`${kind}_${entry.name}`,
				);
				return { ...entry, signature: url };
			}
			return entry;
		}),
	);
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const property = await PropertyService.getPropertyById(id);

		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(property, {
			headers: {
				"Cache-Control": CacheControl.privateShort,
			},
		});
	} catch (error) {
		console.error("Error fetching property:", error);
		return NextResponse.json(
			{ error: "Failed to fetch property" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const updates = await request.json();

		// Upload base64 signature images to B2 and replace with URLs
		if (updates.witnesses?.length) {
			updates.witnesses = await processSignatureEntries(
				id,
				updates.witnesses,
				"witness",
			);
		}
		if (updates.signatures?.length) {
			updates.signatures = await processSignatureEntries(
				id,
				updates.signatures,
				"signatory",
			);
		}

		const updated = await PropertyService.updateProperty(id, updates);

		if (!updated) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error updating property:", error);
		return NextResponse.json(
			{ error: "Failed to update property" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await connectDB();
		const { id } = await params;
		const deleted = await PropertyService.deleteProperty(id);

		if (!deleted) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ message: "Property deleted successfully" });
	} catch (error) {
		console.error("Error deleting property:", error);
		return NextResponse.json(
			{ error: "Failed to delete property" },
			{ status: 500 },
		);
	}
}
