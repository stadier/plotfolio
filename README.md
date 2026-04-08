# Plotfolio

A global property management platform that lets landowners, investors, and developers visualize, manage, and track their real estate portfolios — turning scattered deeds and survey documents into a clean, portfolio-style dashboard with interactive maps and AI-powered document processing.

## Features

### Property Management

- **Full CRUD** — Create, view, update, and delete properties with rich metadata (type, status, condition, zoning, tax ID, pricing, area, amenities)
- **Property Types** — Residential, commercial, industrial, agricultural, vacant land, and mixed-use
- **Status Tracking** — Owned, for sale, rented, under contract, development
- **Document Management** — Upload and organize title deeds, survey plans, contracts, certificates of occupancy, building permits, inspection reports, and more
- **Document Access Control** — Public, request-required, and private access levels with an approval workflow

### Interactive Maps

- **Multi-Renderer Support** — Choose between Leaflet (OpenStreetMap), Mapbox GL, or Google Maps per user preference
- **Boundary Registration** — Three methods: AI extraction from survey documents, manual drawing on map, or programmatic API submission
- **Property Grid Overlay** — Visualize property parcels as grid cells
- **Administrative Boundaries** — State and country border overlays
- **Address Search** — Google Places autocomplete with no country restrictions
- **Property Clustering** — Grouped markers at lower zoom levels

### AI Document Pipeline

- **OCR Extraction** — Google Cloud Vision (primary) with Tesseract.js fallback for browser-based processing
- **PDF Processing** — Text extraction via pdfjs-dist, diagram/image extraction from survey PDFs
- **Structured Data Extraction** — GPT-4o-mini extracts owner info, coordinates, boundaries, bearings, area, and zoning from unstructured document text
- **Auto-Classification** — Automatically detects document type (survey plan, COO, contract, title deed, lease, etc.)
- **Confidence Scoring** — Each extraction scored 0–1 for reliability
- **Vector Indexing** — Documents chunked and embedded for RAG-based Q&A search

### Portfolio Dashboard

- **Portfolio Metrics** — Total worth, property count, total area, document completion
- **Value Trend Charts** — Track portfolio value over time (Recharts)
- **Status Distribution** — Pie chart of property statuses
- **Recent Activity Feed** — Latest property updates
- **Mini Map Widget** — Overview map of all holdings
- **Upcoming Dates** — Calendar of important property dates

### Marketplace

- **Browse Listings** — Public marketplace for properties listed as "for sale"
- **Advanced Filtering** — Filter by type, condition, price range, area, location
- **Favourites** — Bookmark properties of interest
- **Booking Requests** — Request property viewings/consultations with owner approval workflow

### Social & Profiles

- **User Profiles** — Public profiles with sales count, follower count, and property listings
- **Follow System** — Follow other landowners and investors
- **Property Sharing** — Share property links

### Configurable Providers

Users choose their preferred backend services in Settings:

| Service      | Options                           |
| ------------ | --------------------------------- |
| Map Renderer | Leaflet, Mapbox GL, Google Maps   |
| Map Tiles    | OpenStreetMap, Mapbox, Google     |
| Geocoding    | Photon (open-source), Google      |
| OCR          | Google Cloud Vision, Tesseract.js |
| AI Model     | OpenAI GPT-4o-mini                |
| File Storage | Backblaze B2 (via S3 API)         |

## Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)                                |
| Language     | TypeScript 5 (strict mode)                                        |
| UI           | React 19, Tailwind CSS 4                                          |
| Maps         | Leaflet 1.9, Mapbox GL 3.16, Google Maps                          |
| Charts       | Recharts 3.3                                                      |
| Database     | MongoDB 6 (Atlas), Mongoose 8                                     |
| Auth         | Email/password (PBKDF2-SHA512), Google OAuth                      |
| AI / OCR     | OpenAI GPT-4o-mini, Google Cloud Vision, Tesseract.js, pdfjs-dist |
| File Storage | Backblaze B2 (AWS S3 SDK)                                         |
| State        | TanStack React Query 5                                            |
| Icons        | Lucide React                                                      |
| Images       | Sharp                                                             |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- (Optional) Google Cloud Vision API key, OpenAI API key, Backblaze B2 credentials, Google OAuth client ID

### Installation

```bash
git clone https://github.com/stadier/plotfolio.git
cd plotfolio
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
# Required
MONGODB_URI=mongodb+srv://...
MONGODB_DB=plotfolio

# Optional — AI & Document Processing
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Optional — File Storage (Backblaze B2)
B2_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET_NAME=...
B2_ENDPOINT=...

# Optional — Google OAuth
GOOGLE_CLIENT_ID=...

# Optional — Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk...

# Optional — Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
```

### Development

```bash
npm run dev          # Start dev server on port 4600 (Turbopack)
npm run dev:webpack  # Start dev server with Webpack bundler
npm run build        # Production build
npm run start        # Start production server on port 4600
npm run lint         # Run ESLint
```

Open [http://localhost:4600](http://localhost:4600) to view the app.

### Seed Data

Seed the database with sample properties for development:

```bash
curl -X POST http://localhost:4600/api/seed
```

## Project Structure

```
plotfolio-workspace/
├── docs/                    # Guides, architecture docs, tutorials
├── public/
│   ├── uploads/             # Uploaded property files
│   ├── mock-profiles/       # Sample profile images
│   └── mock-properties/     # Sample property images
├── src/
│   ├── app/
│   │   ├── api/             # REST API routes
│   │   │   ├── auth/        #   Authentication (login, signup, Google OAuth)
│   │   │   ├── properties/  #   Property CRUD + survey data + documents
│   │   │   ├── documents/   #   AI document upload, OCR, extraction, Q&A
│   │   │   ├── boundaries/  #   Boundary refinement
│   │   │   ├── bookings/    #   Viewing/consultation requests
│   │   │   ├── favourites/  #   Property bookmarks
│   │   │   ├── follow/      #   User follow system
│   │   │   ├── geocode/     #   Address geocoding
│   │   │   ├── settings/    #   User provider preferences
│   │   │   └── seed/        #   Database seeding
│   │   ├── marketplace/     # Public property listings
│   │   ├── portfolio/       # Authenticated dashboard & map view
│   │   ├── properties/      # Property catalog/list
│   │   ├── settings/        # User settings page
│   │   ├── profile/         # Public user profiles
│   │   └── login/           # Authentication page
│   ├── components/
│   │   ├── layout/          # AppShell, Header, Sidebar
│   │   ├── maps/            # Leaflet, Mapbox, Google Maps components
│   │   ├── property/        # Property cards, forms, drawers, documents
│   │   ├── dashboard/       # Dashboard widgets and stat cards
│   │   ├── survey/          # Survey document components
│   │   └── ui/              # Shared UI primitives
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities, API client, DB connection, AI pipeline
│   ├── models/              # Mongoose schemas (Property, User, AIDocument, etc.)
│   └── types/               # TypeScript interfaces and enums
└── .env.local               # Environment variables
```

## API Overview

| Method   | Endpoint                      | Description                          |
| -------- | ----------------------------- | ------------------------------------ |
| `POST`   | `/api/auth/login`             | Email/password login                 |
| `POST`   | `/api/auth/signup`            | User registration                    |
| `POST`   | `/api/auth/google`            | Google OAuth login                   |
| `GET`    | `/api/auth/me`                | Current session user                 |
| `GET`    | `/api/properties`             | List properties (filterable)         |
| `POST`   | `/api/properties`             | Create property                      |
| `GET`    | `/api/properties/[id]`        | Get property details                 |
| `PUT`    | `/api/properties/[id]`        | Update property                      |
| `DELETE` | `/api/properties/[id]`        | Delete property                      |
| `POST`   | `/api/properties/[id]/survey` | Add survey/boundary data             |
| `POST`   | `/api/documents/upload`       | Upload & process document (OCR + AI) |
| `GET`    | `/api/documents`              | List documents                       |
| `GET`    | `/api/documents/query`        | RAG Q&A over documents               |
| `POST`   | `/api/boundaries/refine`      | AI boundary refinement               |
| `POST`   | `/api/bookings`               | Request property viewing             |
| `POST`   | `/api/favourites`             | Toggle property favourite            |
| `POST`   | `/api/follow`                 | Follow/unfollow user                 |
| `GET`    | `/api/geocode`                | Geocode address                      |
| `POST`   | `/api/seed`                   | Seed sample data                     |

## Documentation

All documentation lives in the [`/docs`](./docs) directory:

- **[Documentation Index](./docs/README.md)** — Full list of available guides
- **[Boundary Registration Guide](./docs/BOUNDARY_REGISTRATION_GUIDE.md)** — Three methods for registering property boundaries
- **[Quick Start: Boundaries](./docs/QUICK_START_BOUNDARIES.md)** — Visual quick-start with diagrams
- **[AI Document Pipeline](./docs/DOCUMENT_AI_PIPELINE.md)** — Architecture of OCR + LLM extraction
- **[AI Boundary Detection](./docs/AI_BOUNDARY_DETECTION.md)** — AI-powered boundary refinement
- **[Mapbox Integration](./docs/MAPBOX_INTEGRATION.md)** — Mapbox GL setup guide
- **[State Borders Feature](./docs/STATE_BORDERS_FEATURE.md)** — Administrative boundary overlays

## Global Platform

Plotfolio is designed for worldwide use — no hardcoded country codes, currencies, or locale restrictions. Google Places autocomplete accepts any global address. Coordinates accept any valid latitude/longitude. Property types cover all real estate categories from vacant land to high-rise developments.
