import { S3Client } from "@aws-sdk/client-s3";

const B2_ENDPOINT = process.env.B2_ENDPOINT!;
const B2_KEY_ID = process.env.B2_KEY_ID!;
const B2_APP_KEY = process.env.B2_APP_KEY!;
export const B2_BUCKET = process.env.B2_BUCKET!;

export const b2 = new S3Client({
	endpoint: `https://${B2_ENDPOINT}`,
	region: "us-east-005",
	credentials: {
		accessKeyId: B2_KEY_ID,
		secretAccessKey: B2_APP_KEY,
	},
	// AWS SDK v3 (≥ 3.729) injects an `x-amz-checksum-crc32` header and
	// `x-amz-sdk-checksum-algorithm=CRC32` query param into every PutObject
	// by default. Backblaze B2 doesn't recognise those checksums, and for
	// presigned browser uploads they also fail the CORS preflight because
	// the browser would need to send the matching `x-amz-checksum-*`
	// header. Disable both so signed URLs work cleanly with B2.
	requestChecksumCalculation: "WHEN_REQUIRED",
	responseChecksumValidation: "WHEN_REQUIRED",
});
