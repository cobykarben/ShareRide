# ShareRide — Product Requirements Document (Assignment-Structured)

## 1. Executive Summary

ShareRide helps drivers headed to events fill their empty seats and helps riders find affordable, pre-planned rides tied to specific events. Unlike on-demand rideshare, ShareRide is event-centric with advance booking, interactive seat selection, and transparent cost sharing. We solve the problem of fragmented, ad-hoc coordination for event travel by providing standardized event listings, ride postings, and simple booking flows.

## 2. Problem Statement & Opportunity

- Problem: Event-goers often struggle to find reliable, affordable transportation to specific events (concerts, games, conferences). Existing options (rideshare, public transit, group chats) are costly, unreliable at peak demand, or hard to coordinate.
- Why it matters: Events create predictable surge travel; riders pay more and drivers drive with unused capacity. Unlocking unused seats reduces cost, congestion, and emissions while improving access to events.
- Current alternatives and gaps:
  - On-demand rideshare: Expensive during events; not pre-planned; limited group/seat coordination.
  - Public transit: Limited schedules/routes; last-mile gaps; capacity constraints.
  - Group chats/spreadsheets: Manual, error-prone, no availability or payment management.

## 3. Target Users & User Personas

- Primary Persona — Event Driver Dana
  - Attends concerts/sports; drives with 2–4 empty seats.
  - Needs an easy way to post rides, set costs, and choose riders.
  - Motivations: Offset costs, meet people, reduce parking hassle.

- Primary Persona — Event Rider Ray
  - Wants affordable, reliable transport to specific events with advance certainty.
  - Needs search by event, clear seat map, transparent costs, and simple payment.
  - Motivations: Lower cost than rideshare, seat choice, predictable pickup.

## 4. MVP Feature Specifications

Include 5 core features. Each feature has a user story and acceptance criteria.

1) Authentication & Profiles (Driver/Rider)
- User story: As a user, I want to register, log in, and manage a basic profile so I can participate as a driver or rider.
- Acceptance criteria:
  - Users can register with email and log in/out.
  - Profiles include username, email, phone, profile picture.
  - Role selection supports driver and/or rider.
  - Verified email required for posting rides or applying.

2) Events Directory & Details
- User story: As a user, I want to search and view events so I can find rides tied to the events I’m attending.
- Acceptance criteria:
  - Create/list events with name, type, location, date/time, description.
  - Search by name, type, date; event detail shows associated rides.
  - Duplicate prevention: similar time/location events consolidated.

3) Vehicle Registration & Seat Templates
- User story: As a driver, I want to register my vehicle so the system can generate the right seating layout for my rides.
- Acceptance criteria:
  - Driver can add vehicle with make/model/year, type, capacity, amenities.
  - Seat template generated based on vehicle type.
  - Vehicle can be referenced when creating a ride.

4) Ride Listings with Interactive Seat Map
- User story: As a driver, I want to create ride listings with seat availability so riders can view and select seats.
- Acceptance criteria:
  - Driver creates a ride linked to a vehicle and event; sets departure time/location, cost per person, tolls/gas estimates, and max riders.
  - System initializes seat map from vehicle template; seats show available/occupied.
  - Riders can view ride details and real-time seat availability.

5) Ride Applications & Basic Cost Split
- User story: As a rider, I want to apply to a ride (optionally selecting a seat) and see my expected cost so I can plan and book confidently.
- Acceptance criteria:
  - Riders can apply to a ride with a seat preference.
  - Driver can accept/reject applications; acceptance assigns or locks a seat.
  - Cost quote shows base per-person cost respecting driver_pays_share.
  - Statuses: application (pending/accepted/rejected) and ride (active/full/completed/cancelled).

## 5. Future Roadmap

- Weeks 2–3: Booking & Concurrency
  - Temporary seat holds with TTL and auto-expiry.
  - Concurrency controls to prevent double booking.
  - Seat reassignment on rider cancellation.

- Weeks 4–5: Payments & Adjustments
  - Payment intents and confirmation flow (provider-agnostic).
  - Post-ride cost adjustments with rider approvals.
  - Refunds (full/partial) and receipts.

- Weeks 6–7: Ratings & Notifications
  - Mutual driver↔rider ratings and review summaries on profiles.
  - Email notifications for applications, decisions, seat updates.

- Weeks 8–9: Search & Discovery Enhancements
  - Advanced ride search filters and sorting (time, price, vehicle type).
  - Event consolidation suggestions and geocoding improvements.

- Weeks 10–12: Social & Admin
  - Friends (requests/accept/decline) and basic social visibility.
  - Admin moderation for events/rides and audit logs.

## 6. Success Metrics

- Supply: Number of active rides per event per week (target: ≥3/event in month 1).
- Conversion: Rider application-to-acceptance rate (target: ≥40% in month 1).
- Seat Utilization: Accepted seats / total seats offered (target: ≥60% in month 2).
- Reliability: Booking conflicts (double-seat errors) per 100 rides (target: ≤1 in month 2).

## 7. Open Questions

- Monetization: Platform fee model—flat per rider vs. percentage of cost share?
- Identity/KYC: What level of driver identity verification is required for launch?
- Liability & Policies: What terms and safety policies are needed for seat-sharing?
- Social Scope: Should friend system be MVP or deferred until after ratings/notifications?
- Geography: Do we constrain to a region/campus initially for density?

---

## Appendix (Non-graded implementation notes)

- Data model aligns with `db/schema.sql` (users, drivers, riders, events, vehicles, rides, seats, applications, payments, ratings).
- Phase focus: MVP Core (authentication, profiles, events, vehicles, rides, applications, basic cost quotes).


