/**
 * Document AI pipeline — barrel export.
 *
 * Provides a unified interface for the full document processing pipeline:
 * OCR → Structured Extraction → Diagram Handling → Indexing → RAG Query
 */

export { extractImagesFromPDF, uploadExtractedImages } from "./diagrams";
export { classifyDocumentType, extractStructuredData } from "./extraction";
export { chunkText, indexDocument, vectorSearch } from "./indexing";
export { extractText } from "./ocr";
export { answerQuestion } from "./query";
