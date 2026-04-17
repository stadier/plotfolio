# GitHub Copilot Instructions for Plotfolio

## Project Overview

Plotfolio is a modern property management application for real estate worldwide, built with Next.js 16, TypeScript, MongoDB, and Leaflet maps. The application enables property owners to visualize, manage, and track their property portfolios (land, houses, buildings, developments) with interactive maps and survey document integration.

## Code Style and Standards

### General Guidelines

- Use TypeScript for all new files with strict type checking
- Follow Next.js 16 App Router conventions
- Use functional components with React hooks
- Implement proper error handling and loading states
- Add meaningful comments for complex logic

### File Organization

- Place all API routes in `/src/app/api/`
- Place all components in `/src/components/` organized by feature
- Place all types in `/src/types/`
- Place all utilities in `/src/lib/`
- Place all database models in `/src/models/`
- **Place ALL documentation in `/docs/` directory** - NO markdown files in root except README.md

### Component Structure

```typescript
"use client"; // Only if needed for client components

import { ... } from "react";
import { ... } from "@/types/...";
import { ... } from "@/lib/...";

interface ComponentProps {
  // Props with detailed comments
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // State declarations
  // Effects
  // Event handlers
  // Render
}
```

### TypeScript Guidelines

- Use interfaces for object shapes
- Use enums for fixed sets of values
- Export types from `/src/types/property.ts`
- Avoid `any` type - use proper types or `unknown`
- Use optional chaining and nullish coalescing

## Architecture Patterns

### Database Layer

- Use Mongoose for MongoDB interactions
- Define schemas in `/src/models/`
- Use `PropertyService` class for business logic
- Always handle database errors gracefully

### API Routes

- Follow REST conventions (GET, POST, PUT, DELETE)
- Return proper HTTP status codes
- Use NextResponse for responses
- Validate input data before processing
- Connect to database at start of handler

### Component Patterns

- Use dynamic imports for map components (avoid SSR issues)
- Implement loading states for async operations
- Use controlled components for forms
- Lift state up when needed for sibling communication
- **Anything potentially reusable must be componentized** (UI blocks, repeated sections, repeated controls, repeated card layouts) instead of duplicated inline
- **Card and metric components must have a max-width** (e.g. `max-w-xs`, `max-w-xl`) — they should never stretch to fill all available space
- **Detail panels and document upload/preview components must have a max-width and stay left-aligned/top-aligned**; on reduced space they should wrap/flex rather than stretch to fill extra width
- **This max-width + top-left alignment rule applies to every UI component in the app**; components should only grow up to their max-width and then wrap/reflow rather than stretching to consume all horizontal space

### Border Radius Standard

The standard border radius for all rectangular UI elements is **`rounded-md`** (matching the portfolio selector). This applies to:

- Form inputs, selects, textareas
- Tag/chip containers (e.g. WitnessTagInput)
- Buttons (action buttons, toggle buttons)
- Dropdown menus and popovers
- Signature pad internal areas
- Any inline rectangular component

**Rules:**

1. **Always use `rounded-md`** as the default border radius for inputs, buttons, containers, and interactive rectangles
2. **Never use `rounded-xl` or `rounded-lg`** on form fields, input wrappers, or button-like elements
3. **Exception:** Modal/dialog outer shells may use `rounded-2xl` for visual distinction; card wrappers (`FormSection`) may use `rounded-xl`
4. **Exception:** Circular elements (avatars, icon-only buttons) use `rounded-full`

### Primary Action Button Standard

All primary action buttons (Add Property, Upload, Create, Save, etc.) **must** use the `<PrimaryButton>` component from `@/components/ui/PrimaryButton`.

```tsx
import PrimaryButton from "@/components/ui/PrimaryButton";

// As a button
<PrimaryButton onClick={handleSave} disabled={saving}>
  <Save className="w-4 h-4" />
  Save
</PrimaryButton>

// As a link
<PrimaryButton href="/portfolio/new">
  <Plus className="w-4 h-4" />
  New Portfolio
</PrimaryButton>

// With size overrides (merged via cn/twMerge)
<PrimaryButton className="px-6 py-2 gap-1.5" />
```

The component encapsulates the standard classes:

```
bg-blue-600 hover:bg-blue-700 text-white font-headline font-bold text-xs uppercase tracking-widest py-2.5 px-4 rounded-md shadow-lg active:scale-95 transition-all flex items-center gap-2 btn-press disabled:opacity-50 disabled:cursor-not-allowed
```

**Rules:**

- **Always use `<PrimaryButton>`** — never write the class string inline
- **Never use `bg-primary rounded-lg`** for action buttons
- **Never use `text-sm font-semibold`** on action buttons
- Pass `className` for overrides (e.g. `px-6`, `justify-center`) — they merge via `twMerge`
- This applies everywhere: toolbars, modals, empty states, form footers, drawers, sidebar CTAs

### Dark Mode — Semantic Token Rules

The project uses **CSS custom properties** defined in `globals.css` under `@theme` (light) and `.dark` (dark override). Tailwind `dark:` variant classes **do not reliably override** base utilities in this setup because `@theme` generates `var(--color-*)` references but the `dark:` specificity can fail. **Always use semantic tokens instead of `dark:` variant pairs.**

#### Required tokens for new components:

| Purpose                          | Token class               | Light value              | Dark value                    |
| -------------------------------- | ------------------------- | ------------------------ | ----------------------------- |
| Card / panel background          | `bg-card`                 | `#ffffff`                | `#1e293b`                     |
| Page / main area background      | `bg-background`           | `#f8f9fa`                | `#0f172a`                     |
| Sidebar background               | `bg-sidebar`              | `#f8fafc`                | `#1e293b`                     |
| Active nav item background       | `bg-nav-active`           | `#ffffff`                | `#334155`                     |
| Borders (cards, header, sidebar) | `border-border`           | `#e2e8f0`                | `#1e293b` (invisible in dark) |
| Translucent overlay (map panels) | `bg-glass`                | `rgba(255,255,255,0.95)` | `rgba(30,41,59,0.95)`         |
| Primary text                     | `text-on-surface`         | `#191c1d`                | `#f8fafc`                     |
| Secondary text                   | `text-on-surface-variant` | `#43474e`                | `#cbd5e1`                     |
| Muted text                       | `text-outline`            | `#74777f`                | `#94a3b8`                     |
| Primary color (headings, links)  | `text-primary`            | `#000e24`                | `#93c5fd`                     |
| Secondary / accent               | `text-secondary`          | `#3b6934`                | `#86efac`                     |

#### Rules:

1. **Never use `bg-white`** on cards, containers, inputs, or panels — use `bg-card`
2. **Never use `border-gray-*` or `border-slate-*`** — use `border-border`
3. **Never use `text-gray-*`** — use `text-on-surface`, `text-on-surface-variant`, or `text-outline`
4. **Never use `bg-gray-*`** — use `bg-surface-container`, `bg-surface-container-high`, etc.
5. **Never pair light + dark: classes** (e.g. `bg-white dark:bg-surface-container-low`) — use the single semantic token (`bg-card`)
6. **Dark mode borders on cards are intentionally invisible** (`--color-border` matches `--color-card` in dark). This is by design — do not add visible borders in dark mode
7. **Exception:** `bg-white/N` on image overlays (badges on photos, translucent map controls) is acceptable since those sit on images, not on dark backgrounds

## Feature-Specific Guidelines

### Property Management

- Properties must have coordinates, area, and status
- Properties can be land plots, houses, buildings, or any real estate
- Support PropertyType enum: RESIDENTIAL, COMMERCIAL, etc.
- Support PropertyStatus enum: OWNED, FOR_SALE, FOR_RENT, FOR_LEASE, UNDER_CONTRACT, RENTED, LEASED, DEVELOPMENT
- Support PropertyCondition enum: includes land conditions (bush, cleared, rocky) and building conditions (under_construction, finished, renovated, needs_repair)

### Boundary Registration

Three methods supported:

1. **Survey Document Upload** - AI extraction of boundaries
2. **Manual Drawing** - Interactive map-based drawing
3. **API Integration** - Programmatic boundary submission

### Map Components

- Use Leaflet with React Leaflet wrapper
- Always use dynamic imports with `ssr: false`
- Default to a global view (lat 20, lng 0, zoom 3) when no property coordinates are available
- Support zoom levels 3-18 for property visualization
- Google Places autocomplete for address search (no country restrictions)

### Survey Data

- Store coordinates as `{ point: string, lat: number, lng: number }[]`
- Store boundaries as `{ from: string, to: string, distance: number }[]`
- Calculate area using Shoelace formula
- Support bearings and measurements

## MongoDB Integration

### Connection

- Use connection pooling via `/src/lib/mongoose.ts`
- Handle connection errors gracefully
- Check connection state before operations

### Schema Design

- Use Mongoose schemas with TypeScript types
- Include timestamps (createdAt, updatedAt)
- Add indexes for frequently queried fields
- Support embedded documents for related data

## Documentation Rules

### Critical Documentation Rule

**When a user provides a command with "(instructions)" in parentheses:**

1. Recognize this as a directive to codify the command
2. Add the rule/pattern to this copilot-instructions.md file
3. Place the rule in the appropriate section
4. Make it clear and actionable for future reference
5. Commit the change to the instructions file

Example:

```
User: "create a docs folder and make sure all mds always go there (instructions)"
→ Add rule: "Place ALL documentation in /docs/ directory"
```

### Documentation Standards

- **ALL markdown files MUST go in `/docs/` directory**
- Only exception: `README.md` in root
- Follow naming convention: UPPERCASE for main docs (README.md, CONTRIBUTING.md)
- Update `/docs/README.md` index when adding new documentation
- Reference docs from main README when user-facing

### Creating Documentation

When creating new documentation:

1. Create file in `/docs/` directory
2. Use clear, descriptive filename
3. Include proper sections and examples
4. Add to documentation index
5. Link from main README if applicable

## API Endpoints

### Properties

- `GET /api/properties` - List all properties
- `GET /api/properties/[id]` - Get single property
- `POST /api/properties` - Create property
- `PUT /api/properties/[id]` - Update property
- `DELETE /api/properties/[id]` - Delete property

### Survey Data

- `POST /api/properties/[id]/survey` - Add survey data to property

### Seeding

- `POST /api/seed` - Seed database with sample properties

## Environment Variables

Required in `.env.local`:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=plotfolio
```

## Global Platform Guidelines

### No Country Restrictions

- This is a worldwide platform — never restrict to a specific country
- No hardcoded country codes, currency symbols, or locale-specific formatting
- Google Places autocomplete: no `componentRestrictions`
- Coordinate validation: accept any valid lat/lng worldwide
- Phone number fields: accept international formats
- Address/location placeholders: use generic examples

### Property Types

- The platform supports ALL real estate: land plots, houses, apartments, commercial buildings, farms, mixed-use developments
- Never use "land plot" exclusively — use "property" as the general term
- PropertyCondition enum covers both land states (bush, cleared, rocky) and building states (under_construction, finished, renovated)
- DocumentType enum includes both land docs (survey, deed) and building docs (building_permit, inspection_report)

## Testing Considerations

- Test database connections before operations
- Validate coordinates are within reasonable ranges
- Ensure boundary points form valid polygons (3+ points)
- Test map rendering at different zoom levels
- Verify survey data extraction accuracy

## Property Specifics

### Typical Dimensions

- Residential plots: 200-2000 sqm depending on region
- Plot shapes: Usually rectangular or irregular polygons
- Buildings: Area measured in sqm or sq ft

### Coordinate System

- Use decimal degrees (not DMS)
- Accept any valid latitude (-90 to 90) and longitude (-180 to 180)

### Legal Documents

- Title deeds
- Survey plans with bearings and distances
- Certificates of Occupancy
- Building permits
- Inspection reports
- Contracts of sale
- Lease agreements

## Common Patterns

### Error Handling

```typescript
try {
	// Operation
} catch (error) {
	console.error("Descriptive message:", error);
	return NextResponse.json({ error: "User-friendly message" }, { status: 500 });
}
```

### Loading States

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);
			// Fetch data
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};
	fetchData();
}, []);
```

### API Client

```typescript
import { PropertyAPI } from "@/lib/api";

const properties = await PropertyAPI.getAllProperties();
const property = await PropertyAPI.getProperty(id);
await PropertyAPI.updateProperty(id, updates);
```

## Performance Optimization

- Use dynamic imports for heavy components (maps, charts)
- Implement pagination for large property lists
- Use MongoDB indexes for frequent queries
- Cache static data when appropriate
- Minimize re-renders with proper memoization

## Security Considerations

- Validate all user input
- Sanitize file uploads
- Use environment variables for secrets
- Implement proper error messages (don't expose internals)
- Validate coordinates and boundaries before saving

## Deployment Notes

- Application runs on Next.js 16 with Turbopack
- MongoDB Atlas for production database
- Static assets in `/public`
- Environment variables required for production
- Build with `npm run build`

## Git Commit Convention

Use conventional commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## Command Codification Rule

**IMPORTANT: When user includes "(instructions)" in their command:**

This signals that the command should become a permanent rule/pattern in this file. When you see this:

1. Parse the command for the underlying rule/pattern
2. Determine the appropriate section of this file
3. Add the rule in clear, actionable language
4. Make it specific and easy to follow
5. Commit the updated instructions file

Example patterns:

- "create X folder and make sure Y always go there (instructions)" → Add file organization rule
- "always use Z when doing W (instructions)" → Add code pattern rule
- "validate X before Y (instructions)" → Add validation rule

The "(instructions)" marker means: **make this a permanent part of how the project works**.

## TODOS Tracking Rule

**Always reference `TODOS.md` when implementing features.** When a feature or improvement from the TODO list is completed:

1. Read `TODOS.md` before starting any feature work to check for relevant items
2. After completing a TODO item, mark it as done by changing `- [ ]` to `- [x]`
3. If a new feature relates to a TODO item, reference the TODO number in commit messages (e.g., `feat: add pagination (TODO #6)`)
4. If new work surfaces a TODO-worthy improvement, add it to the list with the next available number

---

Last updated: April 8, 2026
