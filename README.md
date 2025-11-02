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
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── maps/           # Map-related components
│   ├── property/       # Property management components
│   └── dashboard/      # Dashboard components
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
