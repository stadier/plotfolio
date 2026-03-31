/**
 * Types for the Document AI pipeline.
 * Covers document scanning, OCR extraction, structured data,
 * vector indexing, and RAG-based Q&A.
 */

export interface ExtractedPropertyData {
	ownerName?: string;
	plotSize?: string;
	coordinates?: string[];
	surveyNumber?: string;
	location?: string;
	documentType?: string;
	date?: string;
	// Extended fields for richer extraction
	propertyType?: string;
	area?: string;
	zoning?: string;
	taxId?: string;
	purchasePrice?: string;
	currentValue?: string;
	boughtFrom?: string;
	witnesses?: string[];
	signatures?: string[];
	ownerEmail?: string;
	ownerPhone?: string;
	ownerType?: "individual" | "company" | "trust";
	registrationNumber?: string;
	description?: string;
}

export enum AIDocumentType {
	SURVEY_PLAN = "survey_plan",
	CERTIFICATE_OF_OCCUPANCY = "certificate_of_occupancy",
	CONTRACT_OF_SALE = "contract_of_sale",
	TITLE_DEED = "title_deed",
	LEASE_AGREEMENT = "lease_agreement",
	BUILDING_PERMIT = "building_permit",
	INSPECTION_REPORT = "inspection_report",
	ALLOCATION_LETTER = "allocation_letter",
	OTHER = "other",
}

export interface AIDocument {
	id: string;
	userId: string;
	propertyId?: string;
	fileUrl: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	documentType: AIDocumentType;
	ocrText?: string;
	extractedData?: ExtractedPropertyData;
	confidence?: number; // 0-1 confidence score for extracted fields
	indexed: boolean; // whether vector chunks have been created
	createdAt: string;
	updatedAt: string;
}

export interface DocumentChunk {
	id: string;
	documentId: string;
	chunkText: string;
	chunkIndex: number;
	embedding?: number[];
}

export interface DocumentImage {
	id: string;
	documentId: string;
	imageUrl: string;
	pageNumber?: number;
	description?: string;
}

export interface DocumentUploadRequest {
	file: File;
	userId: string;
	propertyId?: string;
	documentType?: AIDocumentType;
}

export interface DocumentQueryRequest {
	query: string;
	userId?: string;
	propertyId?: string;
	limit?: number;
}

export interface DocumentQueryResponse {
	answer: string;
	sources: Array<{
		documentId: string;
		fileName: string;
		chunkText: string;
		score: number;
	}>;
}

export interface DocumentProcessingResult {
	document: AIDocument;
	images: DocumentImage[];
	chunksCreated: number;
}
