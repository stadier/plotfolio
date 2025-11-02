import {
	DocumentType,
	Property,
	PropertyOwner,
	PropertyStatus,
	PropertyType,
	SurveyData,
} from "@/types/property";
import mongoose, { Document, Schema } from "mongoose";

// Property Owner Schema
const PropertyOwnerSchema = new Schema<PropertyOwner>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	email: { type: String, required: true },
	phone: { type: String },
	type: {
		type: String,
		enum: ["individual", "company", "trust"],
		required: true,
	},
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
	area: { type: Number, required: true },
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
	size: { type: Number },
});

// Main Property Schema
const PropertySchema = new Schema<Property & Document>(
	{
		id: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		address: { type: String, required: true },
		coordinates: {
			lat: { type: Number, required: true },
			lng: { type: Number, required: true },
		},
		area: { type: Number, required: true },
		propertyType: {
			type: String,
			enum: Object.values(PropertyType),
			required: true,
		},
		purchaseDate: { type: Date, required: true },
		purchasePrice: { type: Number, required: true },
		currentValue: { type: Number },
		documents: [PropertyDocumentSchema],
		status: {
			type: String,
			enum: Object.values(PropertyStatus),
			required: true,
		},
		description: { type: String },
		images: [{ type: String }],
		zoning: { type: String },
		taxId: { type: String },
		owner: { type: PropertyOwnerSchema, required: true },
		surveyData: { type: SurveyDataSchema },
		propertyGrid: { type: PropertyGridSchema },
	},
	{
		timestamps: true,
	}
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
	}
);

// Create models
export const PropertyModel =
	mongoose.models.Property ||
	mongoose.model<Property & Document>("Property", PropertySchema);
export const SurveyDocumentModel =
	mongoose.models.SurveyDocument ||
	mongoose.model("SurveyDocument", SurveyDocumentSchema);

// Helper functions for database operations
export class PropertyService {
	static async getAllProperties(): Promise<Property[]> {
		const properties = await PropertyModel.find({}).lean();
		return properties.map((prop) => {
			const { _id, __v, createdAt, updatedAt, ...cleanProp } = prop as any;
			return cleanProp;
		}) as Property[];
	}

	static async getPropertyById(id: string): Promise<Property | null> {
		const property = await PropertyModel.findOne({ id }).lean();
		if (!property) return null;

		const { _id, __v, createdAt, updatedAt, ...cleanProp } = property as any;
		return cleanProp as Property;
	}

	static async createProperty(property: Property): Promise<Property> {
		const created = await PropertyModel.create(property);
		const obj = created.toObject();
		const { _id, __v, createdAt, updatedAt, ...cleanProp } = obj as any;
		return cleanProp as Property;
	}

	static async updateProperty(
		id: string,
		updates: Partial<Property>
	): Promise<Property | null> {
		const updated = await PropertyModel.findOneAndUpdate({ id }, updates, {
			new: true,
		}).lean();

		if (!updated) return null;

		const { _id, __v, createdAt, updatedAt, ...cleanProp } = updated as any;
		return cleanProp as Property;
	}

	static async deleteProperty(id: string): Promise<boolean> {
		const result = await PropertyModel.deleteOne({ id });
		return result.deletedCount > 0;
	}

	static async updateSurveyData(
		propertyId: string,
		surveyData: SurveyData
	): Promise<Property | null> {
		return this.updateProperty(propertyId, {
			surveyData,
			area: surveyData.area,
		});
	}
}
