# Plotfolio.app

A modern web application that lets landowners, investors, and developers instantly visualize all their properties on an interactive, zoomable grid-map — turning scattered deeds into a clean, portfolio-style dashboard.

## Features

- 🗺️ **Interactive Property Maps** - Visualize properties on zoomable grid maps
- 📊 **Portfolio Dashboard** - Clean, organized view of all property holdings
- 📋 **Property Management** - Track deeds, documents, and property details
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔍 **Advanced Search & Filtering** - Find properties quickly
- 📈 **Analytics & Insights** - Property value trends and market data

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet & React Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
plotfolio-workspace/
├── docs/                # 📚 Documentation (guides, tutorials, API docs)
├── src/
│   ├── app/            # Next.js App Router pages & API routes
│   │   └── api/        # REST API endpoints
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # Layout components (Header, Sidebar)
│   │   ├── maps/       # Map-related components (Leaflet)
│   │   ├── property/   # Property management components
│   │   ├── survey/     # Survey document components
│   │   └── dashboard/  # Dashboard components
│   ├── lib/            # Utility functions and configurations
│   │   ├── api.ts      # API client utilities
│   │   ├── mongodb.ts  # MongoDB connection
│   │   └── mongoose.ts # Mongoose setup
│   ├── models/         # Database models (Mongoose schemas)
│   └── types/          # TypeScript type definitions
└── .env.local          # Environment variables (MongoDB, etc.)
```

## 📚 Documentation

All documentation is located in the [`/docs`](./docs) folder:

- **[Boundary Registration Guide](./docs/BOUNDARY_REGISTRATION_GUIDE.md)** - Complete guide on registering land boundaries
- **[Quick Start: Boundaries](./docs/QUICK_START_BOUNDARIES.md)** - Visual quick-start guide with diagrams

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database

This project uses **MongoDB Atlas** for data persistence:
- Property management with full CRUD operations
- Survey document storage and boundary data
- Real-time property tracking and status updates

Configure your MongoDB connection in `.env.local`:
```bash
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=plotfolio
```
