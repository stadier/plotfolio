export interface GridCell {
	lat: number;
	lng: number;
	gridSize: number; // Size in meters
}

export interface PropertyGrid {
	cells: GridCell[];
	gridSize: number;
	color?: string;
}

export interface Property {
	id: string;
	name: string;
	address: string;
	coordinates: {
		lat: number;
		lng: number;
	};
	area: number; // in square feet or acres
	propertyType: PropertyType;
	purchaseDate: Date;
	purchasePrice: number;
	currentValue?: number;
	documents: PropertyDocument[];
	status: PropertyStatus;
	description?: string;
	images?: string[];
	zoning?: string;
	taxId?: string;
	owner: PropertyOwner;
	// Location classification
	state?: string;
	city?: string;
	country?: string;
	surveyData?: SurveyData; // Custom plot boundaries from survey documents
	propertyGrid?: PropertyGrid; // Grid cells defining property boundaries
	conditions?: string[]; // Physical state tags — enum values or custom strings
	visibility?: PropertyVisibility; // Profile/search visibility — defaults to private
	quantity?: number; // Number of identical units (e.g. 10 plots in the same location)
	// Transaction details
	boughtFrom?: string; // Seller / previous owner name
	witnesses?: string[]; // Names of witnesses on the transaction
	signatures?: string[]; // Names of signatories on the transaction
	// Timestamps from Mongoose
	createdAt?: string;
	updatedAt?: string;
}

export interface PropertyOwner {
	id: string;
	name: string;
	username: string;
	displayName: string;
	avatar?: string; // profile picture URL
	banner?: string; // profile banner/cover image URL
	email: string;
	phone?: string;
	type: "individual" | "company" | "trust";
	joinDate?: string; // ISO date string
	salesCount?: number;
}

export enum DocumentAccessLevel {
	PUBLIC = "public", // Anyone can view
	REQUEST_REQUIRED = "request_required", // Must request access
	PRIVATE = "private", // Only owner can view
}

export enum AccessRequestStatus {
	PENDING = "pending",
	APPROVED = "approved",
	DENIED = "denied",
}

export interface PropertyDocument {
	id: string;
	type: DocumentType;
	name: string;
	url: string;
	uploadDate: Date;
	size: number;
	accessLevel: DocumentAccessLevel;
}

export interface DocumentAccessRequest {
	id: string;
	propertyId: string;
	documentId: string;
	requesterId: string;
	requesterName: string;
	requesterEmail: string;
	requesterAvatar?: string;
	ownerId: string;
	status: AccessRequestStatus;
	message?: string;
	responseMessage?: string;
	createdAt: string;
	updatedAt: string;
}

export enum PropertyType {
	RESIDENTIAL = "residential",
	COMMERCIAL = "commercial",
	INDUSTRIAL = "industrial",
	AGRICULTURAL = "agricultural",
	VACANT_LAND = "vacant_land",
	MIXED_USE = "mixed_use",
}

export enum PropertyStatus {
	OWNED = "owned",
	UNDER_CONTRACT = "under_contract",
	FOR_SALE = "for_sale",
	RENTED = "rented",
	DEVELOPMENT = "development",
}

export enum PropertyVisibility {
	PRIVATE = "private", // Only visible to the owner (default)
	PUBLIC = "public", // Visible on profile and in searches
}

export enum PropertyCondition {
	BUSH = "bush",
	CLEARED = "cleared",
	FOUNDATION = "foundation",
	HAS_STRUCTURE = "has_structure",
	FENCED = "fenced",
	PAVED = "paved",
	WATERLOGGED = "waterlogged",
	ROCKY = "rocky",
	UNDER_CONSTRUCTION = "under_construction",
	FINISHED = "finished",
	RENOVATED = "renovated",
	NEEDS_REPAIR = "needs_repair",
}

export enum DocumentType {
	DEED = "deed",
	TITLE = "title",
	SURVEY = "survey",
	APPRAISAL = "appraisal",
	INSURANCE = "insurance",
	TAX_DOCUMENT = "tax_document",
	LEASE = "lease",
	CONTRACT = "contract",
	CONTRACT_OF_SALE = "contract_of_sale",
	CERTIFICATE_OF_OCCUPANCY = "certificate_of_occupancy",
	BUILDING_PERMIT = "building_permit",
	INSPECTION_REPORT = "inspection_report",
	PERMIT = "permit",
	OTHER = "other",
}

export interface Portfolio {
	id: string;
	name: string;
	description?: string;
	properties: Property[];
	totalValue: number;
	totalArea: number;
	createdDate: Date;
	lastUpdated: Date;
}

export interface MapViewport {
	center: [number, number];
	zoom: number;
	bounds?: [[number, number], [number, number]];
}

export interface PropertyFilter {
	propertyType?: PropertyType[];
	status?: PropertyStatus[];
	conditions?: string[];
	priceRange?: {
		min: number;
		max: number;
	};
	areaRange?: {
		min: number;
		max: number;
	};
	searchTerm?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

// Survey Document Types
export interface SurveyDocument {
	id: string;
	propertyId: string;
	fileName: string;
	fileUrl: string;
	uploadDate: Date;
	extractedData?: SurveyData;
	processed: boolean;
}

export interface SurveyData {
	plotNumber?: string;
	area: number; // in sqm
	coordinates: SurveyCoordinate[];
	boundaries: PlotBoundary[];
	measurements: SurveyMeasurement[];
	bearings: SurveyBearing[];
	registrationNumber?: string;
	surveyDate?: Date;
	surveyor?: string;
}

export interface SurveyCoordinate {
	point: string; // e.g., "A", "B", "C", "D"
	lat: number;
	lng: number;
	description?: string;
}

export interface PlotBoundary {
	from: string; // point A
	to: string; // point B
	distance: number; // in meters
	bearing?: number; // in degrees
	description?: string; // e.g., "Along Surcon Road"
}

export interface SurveyMeasurement {
	side: string; // e.g., "AB", "BC"
	length: number; // in meters
	bearing?: number;
}

export interface SurveyBearing {
	from: string;
	to: string;
	bearing: number; // in degrees
	distance: number; // in meters
}
