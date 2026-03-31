# Document AI Pipeline

Low-cost Document AI pipeline for processing real estate/property documents (survey plans, certificates of occupancy, contracts of sale, title deeds, etc.).

## Architecture

```
Upload (PDF/Image)
    │
    ▼
┌─────────────────┐
│  B2 Storage     │  ← File stored permanently
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OCR            │  ← Google Vision (primary) / Tesseract (fallback) / pdfjs (free for text PDFs)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Extraction │  ← GPT-4o-mini: raw text → structured JSON
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────┐
│Diagrams│ │Vector Index  │
│(images)│ │(chunks +     │
│→ B2    │ │ embeddings)  │
└────────┘ └──────┬───────┘
                  │
                  ▼
           ┌────────────┐
           │ RAG Q&A    │  ← Vector search + LLM answer generation
           └────────────┘
```

## API Endpoints

### Upload & Process Document

```
POST /api/documents/upload
Content-Type: multipart/form-data

Fields:
  file: File (required) - PDF or image, max 25 MB
  userId: string (required)
  propertyId: string (optional) - link to a property
  documentType: string (optional) - auto-detected if omitted
  skipIndexing: "true" (optional) - skip vector indexing

Response: {
  document: { id, userId, fileUrl, fileName, documentType, extractedData, confidence, indexed, ... },
  images: [{ imageUrl, pageNumber }],
  chunksCreated: number
}
```

### List Documents

```
GET /api/documents?userId=...&propertyId=...&documentType=...

Response: {
  documents: [{ id, userId, fileUrl, fileName, documentType, extractedData, confidence, indexed, ... }]
}
```

### Get Document Details

```
GET /api/documents/:id

Response: {
  document: { id, ..., ocrText, extractedData },
  images: [{ id, imageUrl, pageNumber }]
}
```

### Delete Document

```
DELETE /api/documents/:id

Response: { success: true }
```

### Re-index Document

```
PATCH /api/documents/:id
Body: { reindex: true }

Response: { reindexed: true, chunksCreated: number }
```

### Query Documents (RAG Q&A)

```
POST /api/documents/query
Body: {
  query: string (required),
  userId: string (optional),
  propertyId: string (optional),
  limit: number (optional, default 5)
}

Response: {
  answer: string,
  sources: [{ documentId, fileName, chunkText, score }]
}
```

### Get Document Images

```
GET /api/documents/:id/images

Response: {
  images: [{ id, documentId, imageUrl, pageNumber, description }]
}
```

## Document Types

| Type                       | Description                                  |
| -------------------------- | -------------------------------------------- |
| `survey_plan`              | Survey plans with coordinates and boundaries |
| `certificate_of_occupancy` | Government-issued occupancy certificates     |
| `contract_of_sale`         | Purchase/sale agreements                     |
| `title_deed`               | Title deeds and ownership documents          |
| `lease_agreement`          | Rental/lease contracts                       |
| `building_permit`          | Construction permits                         |
| `inspection_report`        | Property inspection reports                  |
| `allocation_letter`        | Land allocation letters                      |
| `other`                    | Any other property document                  |

## Extracted Data Schema

The LLM extracts structured JSON from OCR text:

```json
{
	"ownerName": "John Doe",
	"plotSize": "450 sqm",
	"coordinates": ["6.5244° N", "3.3792° E"],
	"surveyNumber": "LS/2024/001",
	"location": "12 Marina Road, Lagos",
	"documentType": "survey_plan",
	"date": "2024-01-15",
	"propertyType": "RESIDENTIAL",
	"area": "450",
	"purchasePrice": "50000000",
	"boughtFrom": "Lagos State Government",
	"registrationNumber": "REG/2024/0012"
}
```

## Cost Optimization

| Operation      | Cost Strategy                                                |
| -------------- | ------------------------------------------------------------ |
| **OCR**        | pdfjs-dist first (free) → Google Vision → Tesseract fallback |
| **Extraction** | GPT-4o-mini (~$0.15/1M input tokens) — cheap and fast        |
| **Embeddings** | text-embedding-3-small ($0.02/1M tokens)                     |
| **Q&A**        | GPT-4o-mini with retrieved context only                      |
| **Storage**    | B2 cloud storage (free 10GB, $0.005/GB after)                |
| **Caching**    | OCR text cached on document record — never re-processed      |
| **Indexing**   | Optional per-document — skip for docs that don't need search |

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...                    # For LLM extraction, embeddings, and Q&A

# Optional (OCR)
GOOGLE_VISION_API_KEY=...                # Google Vision API key (alternative to credentials file)
GOOGLE_APPLICATION_CREDENTIALS=...       # Path to Google Cloud service account JSON

# Already configured
MONGODB_URI=...                          # MongoDB connection
B2_ENDPOINT=...                          # Backblaze B2 endpoint
B2_KEY_ID=...                            # B2 access key
B2_APP_KEY=...                           # B2 secret key
B2_BUCKET=...                            # B2 bucket name
```

## MongoDB Collections

| Collection       | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `aidocuments`    | Main document records with OCR text and extracted data |
| `documentchunks` | Text chunks with embeddings for vector search          |
| `documentimages` | Extracted diagrams/images linked to documents          |

### Vector Search Index (Atlas)

For production, create a vector search index on `documentchunks`:

```json
{
	"name": "vector_index",
	"type": "vectorSearch",
	"definition": {
		"fields": [
			{
				"type": "vector",
				"path": "embedding",
				"numDimensions": 1536,
				"similarity": "cosine"
			},
			{
				"type": "filter",
				"path": "documentId"
			}
		]
	}
}
```

Without the Atlas index, the system falls back to in-memory cosine similarity (works for small datasets).

## Client API

```typescript
import { PropertyAPI } from "@/lib/api";

// Upload a document
const result = await PropertyAPI.uploadDocument(file, userId, {
	propertyId: "abc123",
	documentType: "survey_plan",
});

// List documents
const docs = await PropertyAPI.listDocuments({ userId: "user1" });

// Get document details + extracted images
const detail = await PropertyAPI.getDocument(docId);

// Ask a question about your documents
const answer = await PropertyAPI.queryDocuments("What is the plot size?", {
	userId: "user1",
});

// Get extracted diagrams
const images = await PropertyAPI.getDocumentImages(docId);

// Re-index a document
await PropertyAPI.reindexDocument(docId);

// Delete a document
await PropertyAPI.deleteDocument(docId);
```

## File Structure

```
src/
  types/document.ts              # TypeScript types
  models/AIDocument.ts           # Mongoose models (3 collections)
  lib/documentAI/
    index.ts                     # Barrel export
    ocr.ts                       # Google Vision + pdfjs + Tesseract
    extraction.ts                # LLM structured data extraction
    diagrams.ts                  # PDF image extraction + B2 upload
    indexing.ts                  # Text chunking + embeddings + vector search
    query.ts                     # RAG Q&A system
  app/api/documents/
    route.ts                     # GET /api/documents
    upload/route.ts              # POST /api/documents/upload
    query/route.ts               # POST /api/documents/query
    [id]/route.ts                # GET/DELETE/PATCH /api/documents/:id
    [id]/images/route.ts         # GET /api/documents/:id/images
```
