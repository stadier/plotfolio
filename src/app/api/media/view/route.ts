import { b2, B2_BUCKET } from "@/lib/b2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAME = `${B2_BUCKET}.s3.us-east-005.backblazeb2.com`;

/**
 * GET /api/media/view?url=<encoded-b2-url>
 *
 * Proxies a private Backblaze B2 media file to the browser.
 * Only files under our own B2 bucket are allowed (SSRF guard).
 */
export async function GET(request: NextRequest) {
	try {
		const urlParam = request.nextUrl.searchParams.get("url");
		if (!urlParam) {
			return NextResponse.json(
				{ error: "url param is required" },
				{ status: 400 },
			);
		}

		let parsed: URL;
		try {
			parsed = new URL(urlParam);
		} catch {
			return NextResponse.json({ error: "Invalid url" }, { status: 400 });
		}

		// SSRF guard: only proxy files from our own B2 bucket
		if (parsed.hostname !== ALLOWED_HOSTNAME) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const key = decodeURIComponent(parsed.pathname.slice(1)); // strip leading /

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
		if (response.ContentType) headers.set("Content-Type", response.ContentType);
		if (response.ContentLength !== undefined)
			headers.set("Content-Length", String(response.ContentLength));
		// Long cache on the CDN edge + private for auth scenarios
		headers.set("Cache-Control", "private, max-age=86400");

		return new NextResponse(
			response.Body.transformToWebStream() as ReadableStream,
			{
				status: 200,
				headers,
			},
		);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		// Don't leak internal errors
		if (msg.includes("NoSuchKey") || msg.includes("NotFound")) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		console.error("Error proxying media:", error);
		return NextResponse.json(
			{ error: "Failed to serve media" },
			{ status: 500 },
		);
	}
}
