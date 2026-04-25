## Planned Features

- [x] **1. Bidding & Negotiations** — Sales flow with private sale + auction modes, offer/counter/withdraw, bid placement with anti-sniping window extension, configurable verification gating, installment payment plans, contract signing → payment confirmation → stamping → automatic ownership transfer + history

---

## Suggested Improvements

### Security & Infrastructure

- [ ] **2. API Rate Limiting** — Rate limiting middleware on all endpoints, brute-force prevention, per-user and per-IP limits
- [ ] **3. Input Validation & Sanitization** — Zod schema validation on POST/PUT routes, server-side coordinate/price/enum validation, XSS sanitization
- [ ] **4. CSRF Protection** — CSRF token validation for state-changing API routes
- [ ] **5. File Upload Security** — Server-side file type validation (magic bytes), stricter size limits, malware scanning
- [ ] **5. Land Conflict Resolution** — 2 people registering land in the same geographical location

### Performance & Scalability

- [ ] **6. Pagination** — Cursor-based or offset pagination for property list, document list, and marketplace endpoints
- [ ] **7. Image Optimization** — Thumbnail generation on upload, Next.js Image component, lazy-loading in grids
- [x] **8. Database Query Optimization** — Compound indexes, `.lean()` queries, React Query stale time caching
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

### Subscriptions & Billing

- [x] **33. Subscription Tiers & Feature Gating** — Free/Pro/Business/Enterprise tiers with per-tier feature flags and resource limits, two-layer access control (subscription ceiling + role permissions), tier configs in shared types, `useSubscription` hook for client-side gating, `checkAccess`/`checkFeatureAccess`/`checkLimitAccess` for server-side enforcement
- [x] **34. Payment Gateway Abstraction** — Switchable payment gateways via `PaymentGateway` interface, Stripe and Paystack implementations, factory function selectable by `PAYMENT_GATEWAY` env var or per-request override, webhook handlers for both gateways
- [ ] **35. Billing UI** — Settings billing tab with current plan display, tier comparison cards, upgrade/downgrade flow, cancel/resume controls, payment method management, billing history

### Sales & Marketplace (deferred)

- [ ] **36. Real-time Auction Updates** — WebSocket / SSE channel for live bid feed, replace 8s polling on auction page
- [ ] **37. Stripe Connect Onboarding** — Seller payout flows for platform-mediated sales (Stripe Connect Express + Paystack/Flutterwave splits)
- [ ] **38. Installment Tracking** — Per-installment payment confirmation UI, automatic overdue detection, late fees + interest, buyer reminders
- [ ] **39. Co-ownership** — Multi-party purchases, fractional ownership, joint signing flow, ownership share tracking on `OwnershipRecord`
- [ ] **40. Full Dispute Resolution** — Evidence upload pipeline, admin arbitration workspace, hold-funds escrow, resolution outcomes (refund / split / release)
- [ ] **41. Agent-Facilitated Sales** — UI for portfolio agents to draft and submit sales on behalf of owners, owner approval gate, fee-split between platform and agent
- [ ] **42. Auction Bid Deposits** — Refundable deposit flow, deposit lock/release on bid placement / auction end
- [ ] **43. Country Legal Library Expansion** — Add per-country notarization rules, witness requirements, stamp duty calculators beyond NG/GH/KE/ZA/US/UK/AE
- [ ] **44. Verification ID OCR** — Auto-extract document fields from uploaded ID, face-match liveness check

### WhatsApp Intake & Monetization

- [ ] **45. WhatsApp Property Intake** — Dedicated Plotfolio WhatsApp number (Cloud API via Twilio/360dialog BSP) where agents forward listings (text, images, voice notes) and they land as draft properties in their portfolio. Pipeline: webhook → sender → portfolio routing → LLM extraction (price, location, type, bedrooms, status) reusing `documentExtractor.ts` patterns → image upload to B2 → Whisper voice-note transcription → geocode via `geocode.ts` → draft property in new "Inbox" view. Includes account linking via one-time code, `WhatsAppSubmission` model (raw payload + extracted fields + status: pending/converted/rejected), per-tier message caps to control BSP costs, drafts-by-default to mitigate AI extraction errors. Optional `#portfolio-name` hashtag for multi-portfolio routing.

- [ ] **46. Monetization Strategy & Tiered Pricing** — Layer revenue streams to fund WhatsApp/AI infrastructure costs and shift platform from fully-free to sustainable. Streams: (a) **Agent Pro subscription** (~₦7.5k/mo) gating WhatsApp intake with capped messages, unlimited listings, featured slots, verified badge; (b) **Agency tier** (~₦30k/mo) adding team accounts, branded pages, CRM, broadcasts; (c) **Developer tier** (~₦150k+/mo) for estate developers with custom estate pages and payment plan tools; (d) **Featured/Spotlight/Boost listings** as add-ons across all tiers; (e) **Verified Agent / Verified Property badges** (one-time or annual); (f) **Lead-gen fees** (₦200–₦1k per qualified contact) monetizing intent regardless of off-platform closing; (g) **Document & legal services marketplace** (C of O verification, survey plans, contract drafting) with 15–30% referral cut leveraging `contractTemplates.ts` + `documentAI/`; (h) **Mortgage referral fees** from bank partners (₦20k–₦100k per closed mortgage); (i) **WhatsApp broadcast/CRM tools** letting agents push listings to saved buyer lists via Plotfolio's number; (j) **Transaction take-rate** (~1% capped or flat closing fee) for sales completed on-platform via escrow + `OwnershipTransfer` flow. Extend `Subscription.ts` with new tier metadata and feature flags; integrate with existing `payments/` abstraction.
