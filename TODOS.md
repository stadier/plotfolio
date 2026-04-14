## Planned Features

- [ ] **1. Bidding & Negotiations** — Allow users to bid on properties (negotiation or auction mode), real-time bid notifications, bid history and status tracking

---

## Suggested Improvements

### Security & Infrastructure

- [ ] **2. API Rate Limiting** — Rate limiting middleware on all endpoints, brute-force prevention, per-user and per-IP limits
- [ ] **3. Input Validation & Sanitization** — Zod schema validation on POST/PUT routes, server-side coordinate/price/enum validation, XSS sanitization
- [ ] **4. CSRF Protection** — CSRF token validation for state-changing API routes
- [ ] **5. File Upload Security** — Server-side file type validation (magic bytes), stricter size limits, malware scanning

### Performance & Scalability

- [ ] **6. Pagination** — Cursor-based or offset pagination for property list, document list, and marketplace endpoints
- [ ] **7. Image Optimization** — Thumbnail generation on upload, Next.js Image component, lazy-loading in grids
- [ ] **8. Database Query Optimization** — Compound indexes, `.lean()` queries, React Query stale time caching
- [ ] **9. Map Performance** — Marker clustering, lazy-load tiles/boundaries, debounce viewport events

### User Experience

- [ ] **10. Notifications System** — In-app + email notifications for bookings, document requests, bids, follower activity
- [ ] **11. Multi-Language Support (i18n)** — UI string internationalization, RTL support, locale-aware formatting
- [ ] **12. Onboarding Flow** — Guided tour for new users, sample data exploration, tooltips on complex features
- [ ] **13. Mobile-Responsive Improvements** — Touch-friendly maps, bottom-sheet drawers, swipeable cards
- [ ] **14. Property Comparison** — Side-by-side comparison of 2–4 properties on key metrics
- [ ] **15. Search & Discovery** — Full-text search, saved filters with alerts, map-based area search

### Analytics & Insights

- [ ] **16. Advanced Analytics Dashboard** — Value trends over time, diversification breakdown, rental yield, tax reminders
- [ ] **17. Market Data Integration** — Comparable property prices, neighborhood trends, auto-suggest current value
- [ ] **18. Export & Reporting** — PDF/CSV portfolio export, summary reports with maps, tax reporting

### Collaboration & Social

- [x] **19. Multi-User Property Ownership** — Portfolio entity model with roles (admin/manager/agent/viewer), invite by email/username, team management page, portfolio switcher in sidebar, auto-creation on signup, pending invite notifications
- [ ] **20. Messaging System** — Direct buyer-seller messaging, threaded per-property conversations
- [ ] **21. Reviews & Reputation** — Post-transaction reviews, seller reputation scoring, verified badges
- [x] **27. Ownership Transfer & History** — Initiate ownership transfers to other users/entities, accept/reject/cancel flow, ownership history timeline with support for external/off-platform entities, chain-of-title tracking

### Developer & Platform

- [ ] **22. API Documentation** — OpenAPI/Swagger docs, interactive explorer, API key auth for external access
- [ ] **23. Testing Suite** — Unit tests (API + utils), integration tests (AI pipeline), E2E tests, component tests
- [ ] **24. CI/CD Pipeline** — GitHub Actions for lint/test/build on PR, staging deploy on development, production deploy on main
- [ ] **25. Webhook & Integration Support** — Property event webhooks, listing site integrations, calendar sync (Google/iCal)
- [ ] **26. Offline Support** — Service worker, cache recent properties/documents, queue uploads offline

### Branding & Document Generation

- [x] **28. Seal Creation & Management** — Create custom seals (circle, rectangle, diamond shapes) in Settings > Branding, use for signing documents, set default seal, up to 10 per user
- [x] **29. Contract Generation** — Generate contracts (sale, lease, rent, transfer) from property detail view, prefilled party info, custom clauses, witness fields, seal/stamp integration, print/download as HTML
- [x] **30. Watermark System** — Apply watermarks to documents and images (user seal + Plotfolio branding), configurable position/opacity/tiling, CSS overlay + canvas-based watermark utility
- [ ] **31. PDF Export** — Convert generated HTML contracts to downloadable PDF files with embedded seal and watermark
- [x] **32. Letterhead Templates** — Customizable letterhead with company/personal name, logo, tagline, address, contact details, accent colour, layout (centered/left-aligned/split), divider & footer toggles, live preview, auto-applied to generated contracts
