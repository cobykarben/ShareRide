-- ShareRide Database Schema (Supabase-ready)
-- Derived from MasterPRD.md (backend-first, ordered roadmap)
-- Notes:
-- - Uses UUIDs with gen_random_uuid() (ensure pgcrypto enabled in Supabase)
-- - Emails use citext for normalization/uniqueness
-- - Minimal RLS/policies are not included here; configure in Supabase dashboard as needed
-- - Some advanced features are stubbed for future phases

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================================
-- Enums
-- =====================================================================================

do $$ begin
  create type verification_status as enum ('unverified', 'pending', 'verified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum (
    'concert', 'conference', 'sports', 'festival', 'meetup', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ride_status as enum ('active', 'full', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type seat_state as enum ('available', 'held', 'reserved', 'occupied');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_state as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_intent_state as enum ('created', 'confirmed', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_type as enum (
    'sedan', 'suv', 'minivan', 'pickup', 'van_16_seater', 'hatchback', 'coupe', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- =====================================================================================
-- Utility: updated_at trigger
-- =====================================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

-- =====================================================================================
-- Users & Roles
-- =====================================================================================

-- Application users table (maps to Supabase auth.users via same UUID)
create table if not exists app_user (
  user_id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  password_hash text, -- if using email/password outside auth.users; keep null when fully delegating to Supabase Auth
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_user_set_updated_at
before update on app_user
for each row execute function set_updated_at();

-- Roles (multi-role per user)
do $$ begin
  create type user_role as enum ('driver', 'rider', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists user_roles (
  user_id uuid not null references app_user(user_id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- =====================================================================================
-- Drivers & Riders
-- =====================================================================================

create table if not exists driver (
  driver_id uuid primary key references app_user(user_id) on delete cascade,
  username text,
  email citext,
  phone text,
  profile_picture text,
  driver_rating_avg numeric(3,2) not null default 0,
  driver_rating_count integer not null default 0,
  verification_status verification_status not null default 'unverified',
  payment_methods jsonb, -- placeholder; tokenized refs only
  visibility_public boolean not null default true,
  last_active timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create trigger driver_set_updated_at
before update on driver
for each row execute function set_updated_at();

create table if not exists rider (
  rider_id uuid primary key references app_user(user_id) on delete cascade,
  username text,
  email citext,
  phone text,
  profile_picture text,
  rider_rating_avg numeric(3,2) not null default 0,
  rider_rating_count integer not null default 0,
  verification_status verification_status not null default 'unverified',
  payment_methods jsonb,
  visibility_public boolean not null default true,
  last_active timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create trigger rider_set_updated_at
before update on rider
for each row execute function set_updated_at();

-- =====================================================================================
-- Events
-- =====================================================================================

create table if not exists event (
  event_id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_type event_type not null default 'other',
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  event_date timestamptz not null,
  description text,
  created_by uuid not null references app_user(user_id) on delete restrict,
  status event_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_date on event(event_date);
create index if not exists idx_event_geo on event(latitude, longitude);
create index if not exists idx_event_type on event(event_type);

create trigger event_set_updated_at
before update on event
for each row execute function set_updated_at();

-- =====================================================================================
-- Vehicles
-- =====================================================================================

create table if not exists vehicle (
  car_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete cascade,
  make text,
  model text,
  year integer,
  vehicle_type vehicle_type,
  color text,
  -- For true at-rest encryption, prefer pgcrypto with app-managed key set via `set local app.license_plate_key` per-session
  license_plate_encrypted bytea, -- optional encrypted payload
  seating_capacity integer not null,
  amenities text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicle_driver on vehicle(driver_id);
create index if not exists idx_vehicle_type on vehicle(vehicle_type);

create trigger vehicle_set_updated_at
before update on vehicle
for each row execute function set_updated_at();

-- Optional: seat template per vehicle
create table if not exists vehicle_seat_template (
  template_id uuid primary key default gen_random_uuid(),
  car_id uuid not null references vehicle(car_id) on delete cascade,
  label text not null,
  row_number integer,
  col_number integer,
  attributes jsonb,
  unique (car_id, label)
);

-- =====================================================================================
-- Rides
-- =====================================================================================

create table if not exists ride (
  ride_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete restrict,
  car_id uuid not null references vehicle(car_id) on delete restrict,
  event_id uuid references event(event_id) on delete set null,
  departure_location text,
  departure_latitude numeric(9,6),
  departure_longitude numeric(9,6),
  departure_time timestamptz not null,
  arrival_time timestamptz,
  available_seats integer not null,
  max_riders integer,
  seat_map jsonb, -- serialized occupancy snapshot if needed
  cost_per_person numeric(10,2) not null default 0,
  toll_costs numeric(10,2) not null default 0,
  gas_costs numeric(10,2) not null default 0,
  driver_pays_share boolean not null default false,
  status ride_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_available_seats_nonnegative check (available_seats >= 0)
);

create index if not exists idx_ride_driver on ride(driver_id);
create index if not exists idx_ride_event on ride(event_id);
create index if not exists idx_ride_departure_time on ride(departure_time);
create index if not exists idx_ride_status on ride(status);

create trigger ride_set_updated_at
before update on ride
for each row execute function set_updated_at();

-- Ride seats (live state)
create table if not exists ride_seat (
  seat_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  label text not null,
  row_number integer,
  col_number integer,
  state seat_state not null default 'available',
  held_by_rider_id uuid references rider(rider_id) on delete set null,
  hold_expires_at timestamptz,
  reserved_by_rider_id uuid references rider(rider_id) on delete set null,
  occupied_by_rider_id uuid references rider(rider_id) on delete set null,
  unique (ride_id, label)
);

create index if not exists idx_ride_seat_ride on ride_seat(ride_id);
create index if not exists idx_ride_seat_state on ride_seat(state);

-- Seat holds (TTL)
create table if not exists seat_hold (
  hold_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  rider_id uuid not null references rider(rider_id) on delete cascade,
  seat_label text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (ride_id, seat_label)
);

create index if not exists idx_seat_hold_expires on seat_hold(expires_at);

-- =====================================================================================
-- Ride Applications & Approval
-- =====================================================================================

create table if not exists ride_application (
  application_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  rider_id uuid not null references rider(rider_id) on delete cascade,
  state application_state not null default 'pending',
  selected_seat_label text,
  driver_note text, -- visible to driver only (enforce via RLS)
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (ride_id, rider_id)
);

create index if not exists idx_application_ride on ride_application(ride_id);
create index if not exists idx_application_state on ride_application(state);

-- =====================================================================================
-- Payments & Cost Management (Stubs)
-- =====================================================================================

-- Quote snapshot per ride & parameters
create table if not exists cost_quote (
  quote_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  driver_pays_share boolean not null,
  cost_per_person numeric(10,2) not null,
  toll_costs numeric(10,2) not null,
  gas_costs numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- Payment intents (processor-agnostic)
create table if not exists payment_intent (
  intent_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  rider_id uuid references rider(rider_id) on delete set null,
  quote_id uuid references cost_quote(quote_id) on delete set null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  state payment_intent_state not null default 'created',
  processor_ref text, -- external id
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_ride on payment_intent(ride_id);
create index if not exists idx_payment_state on payment_intent(state);

create trigger payment_intent_set_updated_at
before update on payment_intent
for each row execute function set_updated_at();

-- =====================================================================================
-- Ratings & Reviews
-- =====================================================================================

create table if not exists rating (
  rating_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references ride(ride_id) on delete cascade,
  rater_user_id uuid not null references app_user(user_id) on delete cascade,
  ratee_user_id uuid not null references app_user(user_id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (ride_id, rater_user_id, ratee_user_id)
);

create index if not exists idx_rating_ratee on rating(ratee_user_id);

-- =====================================================================================
-- Notifications (Email + Realtime) - minimal
-- =====================================================================================

do $$ begin
  create type notification_channel as enum ('email', 'push', 'realtime');
exception when duplicate_object then null; end $$;

create table if not exists notification_preference (
  user_id uuid primary key references app_user(user_id) on delete cascade,
  channels notification_channel[] not null default '{email}',
  categories text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at_simple()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger notification_pref_set_updated_at
before update on notification_preference
for each row execute function set_updated_at_simple();

create table if not exists notification (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(user_id) on delete cascade,
  category text not null,
  channel notification_channel not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_user on notification(user_id);

-- =====================================================================================
-- Validation & Security (Audit Log, Idempotency)
-- =====================================================================================

create table if not exists audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity on audit_log(entity_type, entity_id);

create table if not exists idempotency_key (
  key_id uuid primary key default gen_random_uuid(),
  scope text not null, -- e.g., 'reserve_seat'
  idempotency_key text not null,
  response_hash text,
  created_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);

-- =====================================================================================
-- Admin & Ops (Flags) - minimal
-- =====================================================================================

create table if not exists feature_flag (
  flag_name text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger feature_flag_set_updated_at
before update on feature_flag
for each row execute function set_updated_at_simple();

-- =====================================================================================
-- Helpers & Constraints
-- =====================================================================================

-- Prevent multiple accepts beyond capacity: application-level logic recommended,
-- but also provide an informative view for ops.
create or replace view ride_capacity_summary as
select r.ride_id,
       r.available_seats,
       sum(case when a.state = 'accepted' then 1 else 0 end) as accepted_count
from ride r
left join ride_application a on a.ride_id = r.ride_id
group by r.ride_id, r.available_seats;

-- Unique constraints and indexes for frequently filtered fields
create index if not exists idx_driver_email on driver(email);
create index if not exists idx_rider_email on rider(email);

-- =====================================================================================
-- Optional: Foreign key to Supabase auth.users (if desired)
-- Uncomment if you want strict mapping to auth.users.id
-- alter table app_user
--   add constraint app_user_auth_fk
--   foreign key (user_id) references auth.users(id) on delete cascade;

-- =====================================================================================
-- END
-- =====================================================================================


