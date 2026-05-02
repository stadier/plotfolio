import { toPlotWords } from "@/lib/plotwords";
import {
	AccessRequestStatus,
	DocumentAccessLevel,
	MediaType,
	Property,
	PropertyDocument,
	PropertyOwner,
	PropertyStatus,
	PropertyType,
	PropertyVisibility,
	StructureOccupancyStatus,
	SurveyData,
	ZoningType,
} from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function generateShortCode(length = 8): string {
	let code = "";
	for (let i = 0; i < length; i++) {
		code += CHARS[Math.floor(Math.random() * CHARS.length)];
	}
	return code;
}

async function generateUniqueShortCode(): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const code = generateShortCode();
		const existing = await PropertyModel.findOne({ shortCode: code }).lean();
		if (!existing) return code;
	}
	return generateShortCode(10); // fallback to longer code
}

// Property Owner Schema
const PropertyOwnerSchema = new Schema<PropertyOwner>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	username: { type: String, required: true },
	displayName: { type: String, required: true },
	avatar: { type: String },
	banner: { type: String },
	email: { type: String, required: true },
	phone: { type: String },
	type: {
		type: String,
		enum: ["individual", "company", "trust"],
		required: true,
	},
	joinDate: { type: String },
	salesCount: { type: Number, default: 0 },
	followerCount: { type: Number, default: 0 },
	allowBookings: { type: Boolean, default: false },
});

// Survey Data Schema
const SurveyCoordinateSchema = new Schema({
	point: { type: String, required: true },
	lat: { type: Number, required: true },
	lng: { type: Number, required: true },
	description: { type: String },
});

const PlotBoundarySchema = new Schema({
	from: { type: String, required: true },
	to: { type: String, required: true },
	distance: { type: Number, required: true },
	bearing: { type: Number },
	description: { type: String },
});

const SurveyMeasurementSchema = new Schema({
	side: { type: String, required: true },
	length: { type: Number, required: true },
	bearing: { type: Number },
});

const SurveyBearingSchema = new Schema({
	from: { type: String, required: true },
	to: { type: String, required: true },
	bearing: { type: Number, required: true },
	distance: { type: Number, required: true },
});

const SurveyDataSchema = new Schema<SurveyData>({
	plotNumber: { type: String },
	area: { type: Number, default: 0 },
	coordinates: [SurveyCoordinateSchema],
	boundaries: [PlotBoundarySchema],
	measurements: [SurveyMeasurementSchema],
	bearings: [SurveyBearingSchema],
	registrationNumber: { type: String },
	surveyDate: { type: Date },
	surveyor: { type: String },
});

// Grid Cell Schema
const GridCellSchema = new Schema({
	lat: { type: Number, required: true },
	lng: { type: Number, required: true },
	gridSize: { type: Number, required: true },
});

// Property Grid Schema
const PropertyGridSchema = new Schema({
	cells: [GridCellSchema],
	gridSize: { type: Number, required: true },
	color: { type: String },
});

const PropertyStructureSchema = new Schema(
	{
		name: { type: String },
		type: { type: String },
		condition: { type: String },
		floors: { type: Number },
		area: { type: Number },
		bedrooms: { type: Number },
		bathrooms: { type: Number },
		parkingSpaces: { type: Number },
		occupancyStatus: {
			type: String,
			enum: [...Object.values(StructureOccupancyStatus), null],
		},
		yearBuilt: { type: Number },
		notes: { type: String },
	},
	{ _id: false },
);

// Property Document Schema removed — documents now live in the unified
// AIDocumentModel collection (see /src/models/AIDocument.ts). Property
// linkage is via DocumentModel.propertyIds[].

// Document Access Request Schema
const DocumentAccessRequestSchema = new Schema(
	{
		id: { type: String, required: true, unique: true },
		propertyId: { type: String, required: true, index: true },
		documentId: { type: String, required: true },
		requesterId: { type: String, required: true, index: true },
		requesterName: { type: String, required: true },
		requesterEmail: { type: String, required: true },
		requesterAvatar: { type: String },
		ownerId: { type: String, required: true, index: true },
		status: {
			type: String,
			enum: Object.values(AccessRequestStatus),
			default: AccessRequestStatus.PENDING,
		},
		message: { type: String },
		responseMessage: { type: String },
	},
	{
		timestamps: true,
	},
);

// Main Property Schema
const PropertySchema = new Schema<Property & Document>(
	{
		id: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		address: { type: String },
		coordinates: {
			lat: { type: Number, default: 0 },
			lng: { type: Number, default: 0 },
		},
		plotWords: { type: String },
		shortCode: { type: String, index: true },
		area: { type: Number, default: 0 },
		propertyType: {
			type: String,
			enum: Object.values(PropertyType),
		},
		purchaseDate: { type: Date },
		purchasePrice: { type: Number, default: 0 },
		listingPrice: { type: Number },
		currentValue: { type: Number, default: 0 },
		soldPrice: { type: Number },
		soldDate: { type: Date },
		status: {
			type: String,
			enum: Object.values(PropertyStatus),
		},
		description: { type: String },
		images: [{ type: String }],
		media: [
			{
				url: { type: String, required: true },
				type: {
					type: String,
					enum: Object.values(MediaType),
					default: MediaType.IMAGE,
				},
				thumbnail: { type: String },
				caption: { type: String },
				status: {
					type: String,
					enum: ["uploading", "processing", "ready", "failed"],
					default: "ready",
				},
				error: { type: String },
			},
		],
		zoning: { type: String, enum: [...Object.values(ZoningType), null] },
		taxId: { type: String },
		owner: { type: PropertyOwnerSchema },
		portfolioId: { type: String, index: true },
		state: { type: String },
		city: { type: String },
		country: { type: String },
		surveyData: { type: SurveyDataSchema },
		propertyGrid: { type: PropertyGridSchema },
		conditions: [{ type: String }],
		visibility: {
			type: String,
			enum: Object.values(PropertyVisibility),
			default: PropertyVisibility.PRIVATE,
		},
		quantity: { type: Number, default: 1 },
		structure: { type: PropertyStructureSchema },
		bedrooms: { type: Number },
		bathrooms: { type: Number },
		parkingSpaces: { type: Number },
		amenities: [{ type: String }],
		finishingType: { type: String },
		projectName: { type: String },
		availableFrom: { type: String },
		boughtFrom: { type: String },
		witnesses: [
			{
				name: { type: String },
				signature: { type: String },
			},
		],
		signatures: [
			{
				name: { type: String },
				signature: { type: String },
			},
		],
		settings: {
			showOwnershipHistory: { type: Boolean, default: false },
			showPricing: { type: Boolean, default: true },
			showContactInfo: { type: Boolean, default: true },
			allowBookings: { type: Boolean, default: false },
			showLocation: { type: Boolean, default: true },
		},
	},
	{
		timestamps: true,
	},
);

// Survey Document Schema
const SurveyDocumentSchema = new Schema(
	{
		id: { type: String, required: true, unique: true },
		propertyId: { type: String, required: true },
		fileName: { type: String, required: true },
		fileUrl: { type: String, required: true },
		uploadDate: { type: Date, default: Date.now },
		extractedData: { type: SurveyDataSchema },
		processed: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	},
);

// Indexes for common list-endpoint filters. `unique: true` on `id` already
// creates an index, but adding the others ensures `?ownerId=...` /
// `?portfolioId=...&status=...` queries don't collection-scan.
PropertySchema.index({ "owner.id": 1 });
PropertySchema.index({ portfolioId: 1, status: 1 });
PropertySchema.index({ status: 1 });

// Create models
export const PropertyModel =
	mongoose.models.Property ||
	mongoose.model<Property & Document>("Property", PropertySchema);
export const SurveyDocumentModel =
	mongoose.models.SurveyDocument ||
	mongoose.model("SurveyDocument", SurveyDocumentSchema);
export const DocumentAccessRequestModel =
	mongoose.models.DocumentAccessRequest ||
	mongoose.model("DocumentAccessRequest", DocumentAccessRequestSchema);

// Ensure numeric fields always default to 0 (handles existing docs missing values)
function sanitizeProperty(prop: Record<string, any>): Record<string, any> {
	prop.area = prop.area || 0;
	prop.purchasePrice = prop.purchasePrice || 0;
	prop.currentValue = prop.currentValue || 0;
	prop.quantity = prop.quantity || 1;
	prop.visibility = prop.visibility || PropertyVisibility.PRIVATE;
	if (prop.coordinates) {
		prop.coordinates.lat = prop.coordinates.lat || 0;
		prop.coordinates.lng = prop.coordinates.lng || 0;
		if (prop.coordinates.lat !== 0 || prop.coordinates.lng !== 0) {
			prop.plotWords = toPlotWords(prop.coordinates.lat, prop.coordinates.lng);
		}
	}
	if (prop.media) {
		prop.media = prop.media.map((m: any) => {
			const { _id, ...rest } = m;
			return rest;
		});
	}
	if (prop.surveyData) {
		prop.surveyData.area = prop.surveyData.area || 0;
	}
	return prop;
}

// Helper functions for database operations
export class PropertyService {
	/**
	 * Hydrate the legacy `property.documents` array on a Property by joining
	 * with the unified DocumentModel collection. Documents no longer live
	 * on the Property record; this exists so existing UI consumers that
	 * read `property.documents` keep working without per-component fetches.
	 */
	private static async hydrateDocuments<T extends { id: string }>(
		properties: T[],
	): Promise<Array<T & { documents: PropertyDocument[] }>> {
		if (properties.length === 0) {
			return properties as Array<T & { documents: PropertyDocument[] }>;
		}
		// Lazy import to avoid circular module init.
		const { AIDocumentModel } = await import("@/models/AIDocument");
		const ids = properties.map((p) => p.id);
		const docs = await AIDocumentModel.find({ propertyIds: { $in: ids } })
			.sort({ createdAt: -1 })
			.lean();

		const byProperty = new Map<string, PropertyDocument[]>();
		for (const d of docs as Array<{
			_id: unknown;
			propertyIds?: string[];
			fileName: string;
			fileUrl: string;
			fileSize: number;
			documentType: string;
			accessLevel?: DocumentAccessLevel;
			watermark?: unknown;
			aiProcessed?: boolean;
			createdAt: Date;
		}>) {
			const legacy: PropertyDocument = {
				id: String(d._id),
				name: d.fileName,
				url: d.fileUrl,
				size: d.fileSize,
				type: d.documentType as PropertyDocument["type"],
				uploadDate: d.createdAt,
				accessLevel: d.accessLevel ?? DocumentAccessLevel.PUBLIC,
				watermark: (d.watermark as PropertyDocument["watermark"]) ?? null,
				aiProcessed: d.aiProcessed ?? false,
			};
			for (const pid of d.propertyIds ?? []) {
				if (!byProperty.has(pid)) byProperty.set(pid, []);
				byProperty.get(pid)!.push(legacy);
			}
		}

		return properties.map((p) => ({
			...p,
			documents: byProperty.get(p.id) ?? [],
		}));
	}

	/**
	 * List properties matching an optional filter. Filters are pushed down to
	 * Mongo (rather than fetching the entire collection and filtering in JS)
	 * so the list endpoint scales as the user base grows.
	 */
	static async findProperties(
		filter: {
			ownerId?: string | null;
			portfolioId?: string | null;
			statuses?: string[];
			includeDocuments?: boolean;
		} = {},
	): Promise<Property[]> {
		const { ownerId, portfolioId, statuses, includeDocuments = true } = filter;
		const query: Record<string, unknown> = {};
		// Caller may supply both ownerId and portfolioId ("my own portfolio")
		// in which case match either condition to handle stale portfolioIds.
		if (ownerId && portfolioId) {
			query.$or = [{ portfolioId }, { "owner.id": ownerId }];
		} else if (portfolioId) {
			query.portfolioId = portfolioId;
		} else if (ownerId) {
			query["owner.id"] = ownerId;
		}
		if (statuses && statuses.length > 0) {
			query.status = { $in: statuses };
		}

		const properties = await PropertyModel.find(query).lean();
		const cleaned = properties.map((prop) => {
			const { _id, __v, ...cleanProp } = prop as any;
			return sanitizeProperty(cleanProp);
		}) as Property[];
		return includeDocuments ? this.hydrateDocuments(cleaned) : cleaned;
	}

	static async getAllProperties(): Promise<Property[]> {
		return this.findProperties();
	}

	static async getPropertyById(id: string): Promise<Property | null> {
		// Lazy import to avoid circular module init.
		const { AIDocumentModel } = await import("@/models/AIDocument");

		// Run the property fetch and the document join in parallel — they only
		// share the id from the URL, so there's no reason to serialize them.
		const [property, docs] = await Promise.all([
			PropertyModel.findOne({ id }).lean(),
			AIDocumentModel.find({ propertyIds: id }).sort({ createdAt: -1 }).lean(),
		]);
		if (!property) return null;

		const { _id, __v, ...cleanProp } = property as any;
		const sanitized = sanitizeProperty(cleanProp) as Property;
		sanitized.documents = (docs as any[]).map((d) => ({
			id: String(d._id),
			name: d.fileName,
			url: d.fileUrl,
			size: d.fileSize,
			type: d.documentType,
			uploadDate: d.createdAt,
			accessLevel: d.accessLevel ?? DocumentAccessLevel.PUBLIC,
			watermark: d.watermark ?? null,
			aiProcessed: d.aiProcessed ?? false,
		})) as PropertyDocument[];
		return sanitized;
	}

	static async createProperty(property: Property): Promise<Property> {
		if (!property.shortCode) {
			property.shortCode = await generateUniqueShortCode();
		}
		const created = await PropertyModel.create(property);
		const obj = created.toObject();
		const { _id, __v, ...cleanProp } = obj as any;
		const sanitized = sanitizeProperty(cleanProp) as Property;
		// Newly created property has no documents yet.
		sanitized.documents = [];
		return sanitized;
	}

	static async updateProperty(
		id: string,
		updates: Partial<Property>,
	): Promise<Property | null> {
		// `documents` is not a real schema field anymore \u2014 strip it before save.
		const { documents: _ignoredDocs, ...safeUpdates } =
			updates as Partial<Property> & {
				documents?: unknown;
			};
		void _ignoredDocs;
		// Run the update and the document join in parallel \u2014 the docs query
		// only needs the id, not the updated property.
		const { AIDocumentModel } = await import("@/models/AIDocument");
		const [updated, docs] = await Promise.all([
			PropertyModel.findOneAndUpdate({ id }, safeUpdates, { new: true }).lean(),
			AIDocumentModel.find({ propertyIds: id }).sort({ createdAt: -1 }).lean(),
		]);

		if (!updated) return null;

		const { _id, __v, ...cleanProp } = updated as any;
		const sanitized = sanitizeProperty(cleanProp) as Property;
		sanitized.documents = (docs as any[]).map((d) => ({
			id: String(d._id),
			name: d.fileName,
			url: d.fileUrl,
			size: d.fileSize,
			type: d.documentType,
			uploadDate: d.createdAt,
			accessLevel: d.accessLevel ?? DocumentAccessLevel.PUBLIC,
			watermark: d.watermark ?? null,
			aiProcessed: d.aiProcessed ?? false,
		})) as PropertyDocument[];
		return sanitized;
	}

	static async deleteProperty(id: string): Promise<boolean> {
		const result = await PropertyModel.deleteOne({ id });
		return result.deletedCount > 0;
	}

	static async updateSurveyData(
		propertyId: string,
		surveyData: SurveyData,
	): Promise<Property | null> {
		return this.updateProperty(propertyId, {
			surveyData,
			area: surveyData.area,
		});
	}
}
