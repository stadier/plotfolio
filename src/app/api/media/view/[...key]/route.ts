import { b2, B2_BUCKET } from "@/lib/b2";
import { CacheControl } from "@/lib/httpCache";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

/**
 * GET /api/media/view/uploads/<propertyId>/media/<filename>
 *
 * Proxies a private Backblaze B2 media file to the browser using a path-based
 * URL instead of a query string so next/image localPatterns can match it.
 * Only keys that begin with "uploads/" are allowed (SSRF guard).
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	try {
		const { key } = await params;
		const objectKey = key.join("/");
		const range = request.headers.get("range") ?? undefined;

		// SSRF guard: only allow access to keys under our uploads prefix
		if (!objectKey.startsWith("uploads/")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const response = await b2.send(
			new GetObjectCommand({
				Bucket: B2_BUCKET,
				Key: objectKey,
				...(range ? { Range: range } : {}),
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
		if (response.ContentRange)
			headers.set("Content-Range", response.ContentRange);
		headers.set("Accept-Ranges", "bytes");
		headers.set("Cache-Control", CacheControl.privateLong);

		const bodyAny = response.Body as {
			transformToWebStream?: () => ReadableStream;
		};
		const body =
			typeof bodyAny.transformToWebStream === "function"
				? bodyAny.transformToWebStream()
				: (Readable.toWeb(
						response.Body as unknown as Readable,
					) as ReadableStream);

		return new NextResponse(body as ReadableStream, {
			status: response.ContentRange ? 206 : 200,
			headers,
		});
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
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
