import mongoose, {
	Model,
	Document as MongooseDocument,
	Schema,
	Types,
} from "mongoose";

/* ── Unified Document model ─────────────────────────────
 * One collection for ALL documents in the system.
 *
 * - Documents may or may not be linked to properties (propertyIds may be empty).
 * - Documents may or may not have been processed with AI (aiProcessed flag).
 * - Every document has an accessLevel (default PUBLIC) and may carry a watermark.
 *
 * Note: the model name "AIDocument" and the collection name "aidocuments" are
 * preserved so existing data is not orphaned. New code should treat this as the
 * generic Document model (see `DocumentModel` alias below).
 * ─────────────────────────────────────────────────────── */

interface IAIDocument extends MongooseDocument {
	_id: Types.ObjectId;
	userId: string;
	propertyIds: string[];
	fileHash?: string;
	fileUrl: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	documentType: string;
	// Access control — applies to every document
	accessLevel: string;
	watermark?: {
		type?: "seal" | "platform" | "text";
		sealId?: string;
		text?: string;
		opacity?: number;
		position?: string;
		includePlatformBrand?: boolean;
	} | null;
	// AI processing — optional; only populated after extraction has run
	aiProcessed: boolean;
	ocrText?: string;
	extractedData?: Record<string, unknown>;
	confidence?: number;
	indexed: boolean;
	/**
	 * Upload + processing lifecycle. Defaults to "ready" so existing
	 * records (which never had a status) keep behaving normally.
	 */
	uploadStatus?: "uploading" | "processing" | "ready" | "failed";
	uploadError?: string;
	createdAt: Date;
	updatedAt: Date;
}

const WatermarkSubSchema = new Schema(
	{
		type: { type: String, enum: ["seal", "platform", "text"] },
		sealId: String,
		text: String,
		opacity: Number,
		position: String,
		includePlatformBrand: Boolean,
	},
	{ _id: false },
);

const AIDocumentSchema = new Schema<IAIDocument>(
	{
		userId: { type: String, required: true, index: true },
		propertyIds: { type: [String], default: [], index: true },
		fileHash: { type: String },
		fileUrl: { type: String, required: true },
		fileName: { type: String, required: true },
		fileSize: { type: Number, required: true },
		mimeType: { type: String, required: true },
		documentType: {
			type: String,
			required: true,
			enum: [
				"survey_plan",
				"certificate_of_occupancy",
				"contract_of_sale",
				"title_deed",
				"lease_agreement",
				"building_permit",
				"inspection_report",
				"allocation_letter",
				"other",
			],
			default: "other",
		},
		accessLevel: {
			type: String,
			enum: ["public", "request_required", "private"],
			default: "public",
			index: true,
		},
		watermark: { type: WatermarkSubSchema, default: null },
		aiProcessed: { type: Boolean, default: false, index: true },
		ocrText: { type: String },
		extractedData: { type: Schema.Types.Mixed },
		confidence: { type: Number, min: 0, max: 1 },
		indexed: { type: Boolean, default: false },
		uploadStatus: {
			type: String,
			enum: ["uploading", "processing", "ready", "failed"],
			default: "ready",
			index: true,
		},
		uploadError: { type: String },
	},
	{ timestamps: true },
);

AIDocumentSchema.index({ userId: 1, documentType: 1 });
AIDocumentSchema.index({ userId: 1, fileHash: 1 });
AIDocumentSchema.index({ propertyIds: 1, createdAt: -1 });

/* ── Document Chunk (for vector search) ──────────────── */

interface IDocumentChunk extends MongooseDocument {
	documentId: string;
	chunkText: string;
	chunkIndex: number;
	embedding: number[];
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
	{
		documentId: { type: String, required: true, index: true },
		chunkText: { type: String, required: true },
		chunkIndex: { type: Number, required: true },
		embedding: { type: [Number], required: true },
	},
	{ timestamps: true },
);

DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

/* ── Document Image (diagrams extracted from PDFs) ───── */

interface IDocumentImage extends MongooseDocument {
	documentId: string;
	imageUrl: string;
	pageNumber?: number;
	description?: string;
}

const DocumentImageSchema = new Schema<IDocumentImage>(
	{
		documentId: { type: String, required: true, index: true },
		imageUrl: { type: String, required: true },
		pageNumber: { type: Number },
		description: { type: String },
	},
	{ timestamps: true },
);

/* ── Model exports ───────────────────────────────────── */

export const AIDocumentModel: Model<IAIDocument> =
	mongoose.models.AIDocument ||
	mongoose.model<IAIDocument>("AIDocument", AIDocumentSchema);

// Generic alias for new code that should not depend on the legacy name.
export const DocumentModel = AIDocumentModel;

export const DocumentChunkModel: Model<IDocumentChunk> =
	mongoose.models.DocumentChunk ||
	mongoose.model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema);

export const DocumentImageModel: Model<IDocumentImage> =
	mongoose.models.DocumentImage ||
	mongoose.model<IDocumentImage>("DocumentImage", DocumentImageSchema);
