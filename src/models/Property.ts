import {
	AccessRequestStatus,
	DocumentAccessLevel,
	DocumentType,
	MediaType,
	Property,
	PropertyOwner,
	PropertyStatus,
	PropertyType,
	PropertyVisibility,
	SurveyData,
} from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

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

// Property Document Schema
const PropertyDocumentSchema = new Schema({
	id: { type: String, required: true },
	name: { type: String, required: true },
	type: {
		type: String,
		enum: Object.values(DocumentType),
		required: true,
	},
	url: { type: String, required: true },
	uploadDate: { type: Date, default: Date.now },
	size: { type: Number, default: 0 },
	accessLevel: {
		type: String,
		enum: Object.values(DocumentAccessLevel),
		default: DocumentAccessLevel.PUBLIC,
	},
});

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
		area: { type: Number, default: 0 },
		propertyType: {
			type: String,
			enum: Object.values(PropertyType),
		},
		purchaseDate: { type: Date },
		purchasePrice: { type: Number, default: 0 },
		currentValue: { type: Number, default: 0 },
		documents: [PropertyDocumentSchema],
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
			},
		],
		zoning: { type: String },
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
	}
	if (prop.documents) {
		prop.documents = prop.documents.map((doc: any) => {
			const { _id, ...rest } = doc;
			return {
				...rest,
				size: doc.size || 0,
				accessLevel: doc.accessLevel || DocumentAccessLevel.PUBLIC,
			};
		});
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
	static async getAllProperties(): Promise<Property[]> {
		const properties = await PropertyModel.find({}).lean();
		return properties.map((prop) => {
			const { _id, __v, ...cleanProp } = prop as any;
			return sanitizeProperty(cleanProp);
		}) as Property[];
	}

	static async getPropertyById(id: string): Promise<Property | null> {
		const property = await PropertyModel.findOne({ id }).lean();
		if (!property) return null;

		const { _id, __v, ...cleanProp } = property as any;
		return sanitizeProperty(cleanProp) as Property;
	}

	static async createProperty(property: Property): Promise<Property> {
		const created = await PropertyModel.create(property);
		const obj = created.toObject();
		const { _id, __v, ...cleanProp } = obj as any;
		return sanitizeProperty(cleanProp) as Property;
	}

	static async updateProperty(
		id: string,
		updates: Partial<Property>,
	): Promise<Property | null> {
		const updated = await PropertyModel.findOneAndUpdate({ id }, updates, {
			new: true,
		}).lean();

		if (!updated) return null;

		const { _id, __v, ...cleanProp } = updated as any;
		return sanitizeProperty(cleanProp) as Property;
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
