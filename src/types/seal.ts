/**
 * Types for the Seal & Branding system.
 * Covers user seals, watermarking, and document generation.
 */

/* ─── Seal ────────────────────────────────────────────────────── */

export enum SealShape {
	CIRCLE = "circle",
	RECTANGLE = "rectangle",
	ROUNDED_RECTANGLE = "rounded_rectangle",
	DIAMOND = "diamond",
}

export interface SealConfig {
	/** Display text lines (e.g. ["ACME Corp", "CERTIFIED"]) */
	text: string[];
	/** Outer ring text (wraps around circle/shape perimeter) */
	outerText?: string;
	/** Shape of the seal */
	shape: SealShape;
	/** Primary colour (border + text) */
	color: string;
	/** Background colour (default transparent) */
	backgroundColor?: string;
	/** Optional uploaded logo/icon URL (centered) */
	logoUrl?: string;
	/** Font family override */
	fontFamily?: string;
	/** Border width in px */
	borderWidth?: number;
	/** Size in px (width & height) */
	size?: number;
}

export interface UserSeal {
	id: string;
	userId: string;
	name: string;
	config: SealConfig;
	/** Pre-rendered PNG data URL for quick use */
	imageUrl?: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

/* ─── Watermark ───────────────────────────────────────────────── */

export enum WatermarkType {
	/** User's own seal */
	SEAL = "seal",
	/** Plotfolio platform branding */
	PLATFORM = "platform",
	/** Custom text watermark */
	TEXT = "text",
}

export interface WatermarkConfig {
	type: WatermarkType;
	/** For SEAL type — seal ID to use */
	sealId?: string;
	/** For TEXT type — custom text */
	text?: string;
	/** Opacity 0-1 (default 0.15) */
	opacity?: number;
	/** Position: center, bottom-right, tiled */
	position?: "center" | "bottom-right" | "bottom-left" | "tiled";
	/** Include Plotfolio branding alongside seal (default true) */
	includePlatformBrand?: boolean;
}

/* ─── Letterhead ──────────────────────────────────────────────── */

export type LetterheadLayout = "centered" | "left-aligned" | "split";

export interface LetterheadConfig {
	/** Company or personal name shown on the letterhead */
	companyName: string;
	/** Optional tagline / slogan */
	tagline?: string;
	/** Logo image URL (uploaded or seal image) */
	logoUrl?: string;
	/** Contact address */
	address?: string;
	/** Contact phone */
	phone?: string;
	/** Contact email */
	email?: string;
	/** Website URL */
	website?: string;
	/** Company registration / ID number */
	registrationNumber?: string;
	/** Primary brand colour (used for header line and accents) */
	accentColor: string;
	/** Font family for the company name */
	fontFamily?: string;
	/** Header layout */
	layout: LetterheadLayout;
	/** Show a divider line under the header */
	showDivider: boolean;
	/** Show footer with contact info on every page */
	showFooter: boolean;
}

export interface UserLetterhead {
	id: string;
	userId: string;
	config: LetterheadConfig;
	createdAt: string;
	updatedAt: string;
}

/* ─── Document Generation ─────────────────────────────────────── */

export enum ContractType {
	SALE = "sale",
	LEASE = "lease",
	RENT = "rent",
	TRANSFER = "transfer",
}

export interface ContractParty {
	name: string;
	email?: string;
	phone?: string;
	address?: string;
	type: "individual" | "company" | "trust";
}

export interface ContractClause {
	title: string;
	body: string;
}

export interface GenerateContractRequest {
	contractType: ContractType;
	propertyId: string;
	/** Seller / Landlord / Transferor */
	partyA: ContractParty;
	/** Buyer / Tenant / Transferee */
	partyB: ContractParty;
	/** Price / rent amount */
	amount: number;
	currency: string;
	/** Lease/rent: start and end dates (ISO) */
	startDate?: string;
	endDate?: string;
	/** Additional custom clauses */
	additionalClauses?: ContractClause[];
	/** Witnesses */
	witnesses?: ContractParty[];
	/** Apply user's seal */
	sealId?: string;
	/** Apply watermark config */
	watermark?: WatermarkConfig;
}

export interface GeneratedDocument {
	id: string;
	userId: string;
	propertyId: string;
	contractType: ContractType;
	title: string;
	/** The generated HTML content */
	htmlContent: string;
	/** Rendered PDF url (after export) */
	pdfUrl?: string;
	sealId?: string;
	watermark?: WatermarkConfig;
	createdAt: string;
	updatedAt: string;
}
