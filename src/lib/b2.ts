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
});
