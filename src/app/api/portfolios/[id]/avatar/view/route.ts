import { b2, B2_BUCKET } from "@/lib/b2";
import connectDB from "@/lib/mongoose";
import { PortfolioModel } from "@/models/Portfolio";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/portfolios/[id]/avatar/view — proxy the portfolio avatar from B2 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		await connectDB();

		const portfolio = await PortfolioModel.findOne(
			{ id },
			{ avatar: 1, avatarKey: 1 },
		).lean();

		const doc = portfolio as any;
		if (!portfolio || (!doc.avatarKey && !doc.avatar)) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		// Prefer avatarKey; fall back to extracting key from legacy full B2 URL
		let key: string;
		if (doc.avatarKey) {
			key = doc.avatarKey;
		} else {
			try {
				const url = new URL(doc.avatar);
				key = decodeURIComponent(url.pathname.slice(1));
			} catch {
				key = doc.avatar;
			}
		}

		const response = await b2.send(
			new GetObjectCommand({
				Bucket: B2_BUCKET,
				Key: key,
			}),
		);

		if (!response.Body) {
			return NextResponse.json(
				{ error: "Empty response from storage" },
				{ status: 502 },
			);
		}

		const headers = new Headers();
		headers.set("Content-Type", response.ContentType || "image/jpeg");
		if (response.ContentLength !== undefined) {
			headers.set("Content-Length", String(response.ContentLength));
		}
		headers.set("Cache-Control", "public, max-age=86400, immutable");

		const bodyStream = response.Body.transformToWebStream();
		return new NextResponse(bodyStream as ReadableStream, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Portfolio avatar view error:", error);
		return NextResponse.json(
			{ error: "Failed to load avatar" },
			{ status: 500 },
		);
	}
}
