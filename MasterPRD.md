# ShareRide - Master PRD (Backend-First, Ordered Feature Roadmap)

This Master PRD refines the initial `PRD.md` into an implementation-ready, backend-first roadmap. Each core concept has a fully ordered, ascending list of granular features to build from simplest to most advanced. Numbers reset per section to enable selective scoping (e.g., "build Drivers 1-10").

---

## 0. System Foundations (Cross-Cutting)

1. Repository scaffolding (backend service, env config, secrets management)
2. Configuration system (12-factor, per-environment, feature flags)
3. Database provisioning (PostgreSQL), migrations framework
4. Base domain models and ORM setup
5. API server setup (HTTP + REST), routing, error middleware
6. Logging framework (structured logs, request IDs)
7. Health/readiness endpoints and basic observability hooks
8. Background job runner (for emails, notifications)
9. Rate limiting middleware (per IP and per user)
10. Input validation framework (schema-based)

---

## 1. Authentication & Identity

1. User table with `user_id` (UUID), `created_at`, `updated_at`
2. Email field (unique), normalized and indexed
3. Password hash storage (Argon2/BCrypt), password policy
4. Registration endpoint `POST /api/auth/register`
5. Login endpoint `POST /api/auth/login`
6. JWT issuance (access + refresh), rotation strategy
7. Token blacklist/nonce for logout and compromise handling
8. Email verification tokens and `verified_at`
9. Resend verification endpoint
10. Forgot password flow (token, expiry, reset endpoint)
11. Basic roles: `driver`, `rider`, `admin` (nullable multi-role)
12. Role-based middleware guards
13. Session introspection endpoint
14. Device/session table (optional metadata)
15. Enforcement of verified email before privileged actions
16. OAuth provider placeholders (structure, disabled by default)
17. Brute-force protection (login throttling)
18. Audit log for auth events
19. Webhook/event emission for auth lifecycle
20. Admin override for account lock/unlock

---

## 2. Drivers

1. `driver_id` (FK to `user_id`, 1:1 mapping)
2. `username`
3. `email`
4. `phone`
5. `profile_picture` (URL)
6. `driver_rating` (aggregate fields: count, average)
7. `verification_status` (enum: unverified, pending, verified)
8. `payment_methods` linkage placeholder (no processor yet)
9. `created_at`, `last_active`
10. Create/Read/Update driver profile endpoints
11. Soft delete/deactivation
12. Driver visibility settings (public profile toggle)
13. Driver ride counters (active, completed)
14. Driver availability status (open to rides)
15. Basic KYC fields (name, DOB; stored securely)
16. KYC status lifecycle (requested, submitted, approved)
17. Driver documents (license upload metadata)
18. Driver notifications preferences
19. Driver payout preferences stub
20. Email/phone verification status surfacing
21. Privacy controls (mask contact until match)
22. Profile change history (auditable)
23. Blocklist/allowlist of riders (ids only)
24. Driver notes (private, for admin)
25. Account flags (trust, risk indicators)
26. Rate-limited profile updates
27. Public driver profile endpoint (sanitized)
28. Embedded rating snapshot in profile responses
29. Driver search exposure toggles (searchable indexing flag)
30. API pagination/sorting for driver listings
31. Driver webhooks (profile updated)
32. Driver export (data portability endpoint)
33. GDPR deletion handling (anonymization workflow)
34. Multi-vehicle ownership support indicator
35. Feature flags to gate advanced capabilities per driver

---

## 3. Riders

1. `rider_id` (FK to `user_id`, 1:1 mapping)
2. `username`
3. `email`
4. `phone`
5. `profile_picture` (URL)
6. `rider_rating` (aggregate fields)
7. `verification_status`
8. `payment_methods` linkage placeholder
9. `created_at`, `last_active`
10. Create/Read/Update rider profile endpoints
11. Soft delete/deactivation
12. Rider visibility settings
13. Rider preferences (quiet ride, luggage, etc.)
14. Saved payment method reference (masked)
15. Rider notifications preferences
16. Blocklist/allowlist of drivers
17. Profile change history (auditable)
18. Privacy controls (mask contact until accepted)
19. Public rider profile endpoint (sanitized)
20. Application counters (pending, accepted, rejected)
21. Favorite events and rides
22. Recently viewed rides cache
23. Rate-limited profile updates
24. Rider webhooks (profile updated)
25. Rider export (data portability endpoint)
26. GDPR deletion handling (anonymization workflow)
27. Verified status badges exposure
28. Social graph degree preview (if friend system active)
29. Seat selection history (preferences)
30. Feature flags to gate advanced capabilities per rider

---

## 4. Events

1. `event_id` (UUID)
2. `event_name`
3. `event_type` (enum)
4. `location` (address string)
5. `coordinates` (lat, lng)
6. `event_date` (timestamp)
7. `description`
8. `created_by` (FK to user)
9. `created_at` and `status` (active, completed, cancelled)
10. Create/Read/Update/Delete events (guarded by role)
11. Indexing by time and location
12. Search by name, type, date range, radius
13. Duplicate prevention within 2-hour/location window
14. Event consolidation suggestion endpoint
15. Geocoding integration placeholder (adapter + interface)
16. Address normalization and validation
17. Event slug generation (stable URLs)
18. Event participation counters (rides, riders)
19. Event visibility controls (public vs private)
20. Event moderation flags
21. Event image assets metadata
22. Event webhook (created/updated)
23. Event archiving policy
24. Soft delete with referential integrity
25. Admin override for duplicates

---

## 5. Vehicles

1. `car_id` (UUID)
2. `driver_id` (owner)
3. `make`
4. `model`
5. `year`
6. `vehicle_type` (sedan, SUV, minivan, pickup, van_16_seater, etc.)
7. `color`
8. `license_plate` (encrypted at rest)
9. `seating_capacity`
10. `amenities` (array)
11. `created_at`
12. Create/Read/Update/Delete vehicle endpoints
13. Vehicle type auto-categorization helper
14. Seat map template generator per `vehicle_type`
15. Vehicle photos metadata
16. Vehicle availability toggle
17. Vehicle verification status (optional)
18. Vehicle ownership constraints (1:N driver:vehicles)
19. Seat labeling convention (rows, columns)
20. Amenity taxonomy (normalized table)
21. Vehicle change history (auditable)
22. Search/filter vehicles by type/capacity
23. Seat map versioning when layout changes
24. Deletion guard if connected to active rides
25. Webhook (vehicle updated)

---

## 6. Rides

1. `ride_id` (UUID)
2. `driver_id`
3. `car_id`
4. `event_id`
5. `departure_location`
6. `departure_time`
7. `arrival_time` (ETA)
8. `available_seats`
9. `seat_map` (serialized occupancy state)
10. `cost_per_person` (base)
11. `toll_costs` (estimate)
12. `gas_costs` (estimate)
13. `driver_pays_share` (boolean)
14. `max_riders`
15. `status` (active, full, completed, cancelled)
16. Create ride with validation (driver, vehicle availability)
17. Update ride details constraints (time windows)
18. Initial seat map generation from vehicle template
19. Cost pre-calculation snapshot
20. Public ride details endpoint (sanitized)
21. Ride search with filters and sorting
22. Real-time availability updates (polling baseline)
23. Soft close ride (no new applications)
24. Ride cancellation flow and notifications
25. Driver notes (private)
26. Rider roster export (driver-visible)
27. Ride duplicate prevention check
28. Mileage and route metadata (optional fields)
29. Webhooks (ride created/updated/status)
30. Archival policy for completed rides

---

## 7. Seat Management & Booking

1. `GET /api/rides/{ride_id}/seats` returns current seat map
2. Seat entity model (seat_id, label, row/col, attributes)
3. Seat states: available, held, reserved, occupied
4. Temporary reservation (hold) with TTL
5. Concurrency control for seat holds (atomic checks)
6. `POST /api/rides/{ride_id}/reserve` to place a hold
7. `DELETE /api/rides/{ride_id}/reserve/{hold_id}` to release
8. Auto-expiry of holds via background job
9. Seat selection preferences (near window/door)
10. Seat proximity metadata (neighbors)
11. Rider application includes seat preference
12. Seat assignment upon driver acceptance
13. Reassignment on rider cancellation
14. Pre-occupied seats set by driver during creation
15. Real-time seat updates via polling baseline
16. Upgrade path to WebSockets events (deferred)
17. Audit log of seat state transitions
18. Edge-case handling on ride cancellation (release all)
19. Bulk operations for multi-seat bookings
20. API idempotency keys for reservation requests

---

## 8. Ride Applications & Approval

1. `POST /api/rides/{ride_id}/apply` with rider profile snapshot
2. Application states: pending, accepted, rejected, withdrawn
3. Driver `GET/PUT /api/rides/{ride_id}/applications`
4. Acceptance assigns seat (if selected) and locks seat
5. Rejection releases any holds
6. Notification to rider on decision
7. Limit concurrent applications per rider per ride
8. Application notes (driver-only)
9. Application history and timestamps
10. Prevent multiple accepts beyond capacity
11. Auto-expire stale pending applications (configurable)
12. Idempotency for application submissions
13. Webhooks (application submitted/decided)
14. Rate limits on submissions
15. Admin override for disputes

---

## 9. Payments & Cost Management

1. Cost calculation endpoint `POST /api/rides/{ride_id}/calculate-cost`
2. Basic per-person split based on `cost_per_person`
3. Include `toll_costs` and `gas_costs` in breakdown
4. Respect `driver_pays_share` toggle
5. Generate a cost quote ID (immutable snapshot)
6. Payment method token linkage (abstract interface)
7. Charge creation stub (no processor yet)
8. Payment intent with state machine (created, confirmed, failed)
9. Split payments among accepted riders
10. Driver payout calculation stub
11. Refund flow (full/partial) state machine
12. Post-ride cost adjustment `PUT /api/rides/{ride_id}/adjust-costs`
13. Rider approval workflow for increases
14. Additional payments collection after adjustment
15. Payment receipts (PDF/metadata link)
16. Idempotency keys for payment endpoints
17. Webhooks ingestion placeholder (processor-agnostic)
18. PCI considerations (no raw PAN storage)
19. Reconciliation reports (daily summary)
20. Dispute handling stubs and evidence links

---

## 10. Ratings & Reviews

1. `POST /api/ratings` to submit rating (driver↔rider)
2. Validate ride completion before rating
3. Store rating (1–5) and optional text review
4. Aggregate rating fields update (avg, count)
5. Prevent self-rating and duplicate rating per ride
6. `GET /api/users/{user_id}/ratings` history
7. Recent review summaries for profiles
8. Flagging/inappropriate content marker
9. Soft moderation queue for flagged reviews
10. Edit/delete window for reviewers (time-limited)
11. Anti-retaliation hiding (optional policy)
12. Webhooks (rating submitted)
13. Exposure controls (min sample size)
14. Spam/throttle protection
15. Searchable review content (admin-only)

---

## 11. Notifications (Email + Realtime)

1. Notification preferences per user (channels, categories)
2. Email provider integration (adapter interface)
3. Templated emails: verification, password reset, receipts
4. Event triggers: applications, decisions, seat updates, payments
5. Notification queue and retries
6. Digest vs instant setting for low-priority messages
7. Realtime transport abstraction (WS placeholder)
8. Delivery status tracking and logs
9. Unsubscribe handling and compliance fields
10. Admin broadcast capability (announcements)
11. Template versioning and preview API
12. Localization-ready templates

---

## 12. Friends & Social (Optional, Toggleable)

1. Friend request `POST /api/friends/request`
2. List/accept/decline/remove friends
3. Pending requests notifications
4. Mutual friend suggestions (ride history based)
5. Privacy settings for social visibility
6. Abuse prevention (rate limiting, blocks)
7. Social graph exposure in profiles

---

## 13. Validation & Security

1. Centralized input validation schemas (per endpoint)
2. Coordinate and time validation utilities
3. Capacity validation (vehicle vs ride seats)
4. Cost validation (non-negative, bounds)
5. Output sanitization and response shaping
6. Role-based authorization checks across endpoints
7. JWT verification and clock-skew handling
8. Sensitive data encryption at rest (license plates, KYC)
9. TLS enforcement and HSTS guidance
10. API rate limits per route category
11. Audit logging for sensitive actions
12. CSRF strategy for web clients (if applicable)
13. Idempotency enforcement where needed
14. Secrets rotation policy and tooling
15. GDPR/CCPA compliance hooks (export/delete)
16. Security headers middleware
17. Dependency vulnerability scanning
18. Disaster recovery/backup policy (DB snapshots)
19. PII data classification registry
20. Penetration testing remediation backlog

---

## 14. Admin & Operations

1. Admin role and permissions matrix
2. Admin authentication hardening (MFA recommended)
3. Admin APIs for users (ban/unban, verify)
4. Admin event moderation (merge, delete)
5. Ride oversight (force-cancel, reassign)
6. Payment reconciliation views
7. Ratings moderation queue
8. Notification deliverability dashboard
9. Audit log browsing
10. Config flags management (ops-only)
11. Data export tooling
12. Support notes and ticket linkage
13. Read-only maintenance mode toggle
14. Background jobs dashboard
15. Compliance reports generation

---

## 15. Analytics & Observability

1. Request metrics (latency, error rates)
2. Domain metrics (rides created, applications, conversions)
3. Seat utilization KPIs
4. Payment success/failure funnels
5. Notification deliverability metrics
6. Rating distribution analytics
7. Event search to ride conversion tracking
8. Driver supply vs rider demand ratios
9. Basic BI exports (CSV)
10. Data retention policies for analytics tables
11. A/B test flagging (feature flags metadata)
12. Tracing integration (spans around critical flows)
13. Alerting thresholds (SLOs) for core endpoints

---

## Build Phase Recommendations

To start super simple and ramp up complexity:

- Phase A (MVP Core): System Foundations 1–10, Authentication 1–10, Drivers 1–12, Riders 1–12, Events 1–12, Vehicles 1–14, Rides 1–20
- Phase B (Booking): Seat Management 1–12, Applications 1–8, Rides 21–30
- Phase C (Payments): Payments 1–12, Validation & Security 1–12
- Phase D (Quality & Scale): Ratings 1–8, Notifications 1–8, Admin & Operations 1–8, Analytics 1–8
- Phase E (Advanced): Remaining items across all sections, Friends & Social

---

Notes:
- All lists are ordered for implementation sequence; later items may depend on earlier foundations.
- Feature flags can be used to gate advanced capabilities while moving fast through the roadmap.



