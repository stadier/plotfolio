import mongoose, {
	Model,
	Document as MongooseDocument,
	Schema,
	Types,
} from "mongoose";

/* ── AI Document ─────────────────────────────────────── */

interface IAIDocument extends MongooseDocument {
	_id: Types.ObjectId;
	userId: string;
	propertyIds: string[];
	fileUrl: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	documentType: string;
	ocrText?: string;
	extractedData?: Record<string, unknown>;
	confidence?: number;
	indexed: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const AIDocumentSchema = new Schema<IAIDocument>(
	{
		userId: { type: String, required: true, index: true },
		propertyIds: { type: [String], default: [], index: true },
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
		ocrText: { type: String },
		extractedData: { type: Schema.Types.Mixed },
		confidence: { type: Number, min: 0, max: 1 },
		indexed: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

AIDocumentSchema.index({ userId: 1, documentType: 1 });
AIDocumentSchema.index({ propertyIds: 1 });

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

// If using MongoDB Atlas Vector Search, create a vector index
// named "vector_index" on the "embedding" field via Atlas UI/CLI.
// The search query in the RAG module uses $vectorSearch aggregation.
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

export const DocumentChunkModel: Model<IDocumentChunk> =
	mongoose.models.DocumentChunk ||
	mongoose.model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema);

export const DocumentImageModel: Model<IDocumentImage> =
	mongoose.models.DocumentImage ||
	mongoose.model<IDocumentImage>("DocumentImage", DocumentImageSchema);
