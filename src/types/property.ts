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

export enum MediaType {
	IMAGE = "image",
	VIDEO = "video",
	AUDIO = "audio",
}

export interface PropertyMedia {
	url: string;
	type: MediaType;
	thumbnail?: string; // optional preview image for video/audio
	caption?: string;
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
	images?: string[]; // legacy — prefer media[]
	media?: PropertyMedia[];
	zoning?: string;
	taxId?: string;
	owner: PropertyOwner;
	portfolioId?: string; // Which portfolio this property belongs to
	// Location classification
	state?: string;
	city?: string;
	country?: string;
	surveyData?: SurveyData; // Custom plot boundaries from survey documents
	propertyGrid?: PropertyGrid; // Grid cells defining property boundaries
	conditions?: string[]; // Physical state tags — enum values or custom strings
	visibility?: PropertyVisibility; // Profile/search visibility — defaults to private
	quantity?: number; // Number of identical units (e.g. 10 plots in the same location)
	// Building details
	bedrooms?: number;
	bathrooms?: number;
	parkingSpaces?: number;
	amenities?: string[]; // e.g. "Private Pool", "Balcony", "Security"
	finishingType?: string; // e.g. "Fully Finished", "Semi-Finished", "Core & Shell"
	projectName?: string; // Development or estate name
	availableFrom?: string; // ISO date string
	// Transaction details
	boughtFrom?: string; // Seller / previous owner name
	witnesses?: { name: string; signature: string }[]; // Witnesses with drawn signatures
	signatures?: { name: string; signature: string }[]; // Signatories with drawn signatures
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
	followerCount?: number;
	allowBookings?: boolean; // whether visitors can book consultation/inspection slots
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
	FOR_SALE = "for_sale",
	FOR_RENT = "for_rent",
	FOR_LEASE = "for_lease",
	UNDER_CONTRACT = "under_contract",
	RENTED = "rented",
	LEASED = "leased",
	DEVELOPMENT = "development",
}

/** Tooltip descriptions for each property status */
export const STATUS_DESCRIPTIONS: Record<PropertyStatus, string> = {
	[PropertyStatus.OWNED]:
		"Property you own and hold — not currently listed or available.",
	[PropertyStatus.FOR_SALE]:
		"Property actively listed for sale on the marketplace.",
	[PropertyStatus.FOR_RENT]:
		"Available for short-term rental (month-to-month, flexible terms).",
	[PropertyStatus.FOR_LEASE]:
		"Available for long-term lease (fixed contract, e.g. 1–5 years).",
	[PropertyStatus.UNDER_CONTRACT]:
		"A sale, rent, or lease agreement is in progress.",
	[PropertyStatus.RENTED]:
		"Currently rented out to a tenant on short-term/monthly terms.",
	[PropertyStatus.LEASED]:
		"Currently under a fixed-term lease agreement with a tenant.",
	[PropertyStatus.DEVELOPMENT]:
		"Under construction or active development — not yet ready.",
};

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

export enum PortfolioRole {
	ADMIN = "admin",
	MANAGER = "manager",
	AGENT = "agent",
	VIEWER = "viewer",
}

export enum PortfolioMemberStatus {
	PENDING = "pending",
	ACTIVE = "active",
	SUSPENDED = "suspended",
}

export interface Portfolio {
	id: string;
	name: string;
	slug: string;
	description?: string;
	avatar?: string;
	type: "personal" | "business";
	createdBy: string; // userId who created it
	createdAt?: string;
	updatedAt?: string;
}

export interface PortfolioMember {
	id: string;
	portfolioId: string;
	userId: string;
	role: PortfolioRole;
	status: PortfolioMemberStatus;
	invitedBy?: string; // userId who invited
	joinedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

/** Computed view of a portfolio with its properties (not stored) */
export interface PortfolioView {
	portfolio: Portfolio;
	role: PortfolioRole;
	properties: Property[];
	totalValue: number;
	totalArea: number;
	memberCount: number;
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

/* ─── Favourite ───────────────────────────────────────────────── */

export interface Favourite {
	id: string;
	userId: string;
	propertyId: string;
	createdAt?: string;
}

/* ─── Follow ──────────────────────────────────────────────────── */

export interface Follow {
	id: string;
	followerId: string; // user doing the following
	followingId: string; // owner being followed
	createdAt?: string;
}

/* ─── Booking ─────────────────────────────────────────────────── */

export enum BookingType {
	CONSULTATION = "consultation",
	INSPECTION = "inspection",
}

export enum BookingStatus {
	PENDING = "pending",
	CONFIRMED = "confirmed",
	CANCELLED = "cancelled",
	COMPLETED = "completed",
}

export interface Booking {
	id: string;
	ownerId: string; // the property owner being booked
	requesterId: string; // user requesting the booking
	requesterName: string;
	requesterEmail: string;
	type: BookingType;
	date: string; // ISO date string (YYYY-MM-DD)
	time: string; // HH:mm
	message?: string;
	status: BookingStatus;
	propertyId?: string; // optional — specific property for inspection
	createdAt?: string;
	updatedAt?: string;
}
