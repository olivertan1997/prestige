// Database schema for Supabase PostgreSQL. Safe to run many times (everything is "if not exists").
// Run by scripts/migrate.ts during each deploy, and by the test suite on its in-memory database.

export const SCHEMA_SQL = `
create table if not exists user_profiles (
  id integer generated always as identity primary key,
  role text not null unique check (role in ('USER_ADMIN','INTERIOR_DESIGNER','CUSTOMER','PLATFORM_MANAGEMENT')),
  name text not null,
  description text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists user_accounts (
  id integer generated always as identity primary key,
  username text not null unique,
  email text not null unique,
  full_name text not null,
  password_hash text not null,
  role text not null check (role in ('USER_ADMIN','INTERIOR_DESIGNER','CUSTOMER','PLATFORM_MANAGEMENT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED','BANNED')),
  status_reason text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  id text primary key,
  user_id integer not null references user_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_sessions_user on sessions(user_id);

create table if not exists companies (
  id integer generated always as identity primary key,
  designer_id integer not null unique references user_accounts(id),
  name text not null,
  registration_number text,
  description text,
  address text,
  phone text,
  email text,
  website text,
  years_in_business integer,
  specialties text,
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id integer generated always as identity primary key,
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists design_projects (
  id integer generated always as identity primary key,
  designer_id integer not null references user_accounts(id),
  category_id integer references categories(id),
  title text not null,
  description text,
  style text,
  location text,
  budget numeric(12,2),
  status text not null default 'CURRENT' check (status in ('CURRENT','PAST')),
  start_date date,
  end_date date,
  image_url text,
  view_count integer not null default 0,
  shortlist_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projects_designer on design_projects(designer_id);

create table if not exists favourites (
  id integer generated always as identity primary key,
  customer_id integer not null references user_accounts(id),
  project_id integer not null references design_projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, project_id)
);

create table if not exists project_activities (
  id integer generated always as identity primary key,
  project_id integer not null references design_projects(id) on delete cascade,
  user_id integer references user_accounts(id),
  type text not null check (type in ('VIEW','SHORTLIST')),
  occurred_at timestamptz not null default now()
);
create index if not exists idx_activity_type_time on project_activities(type, occurred_at);
create index if not exists idx_activity_project on project_activities(project_id);

create table if not exists ratings (
  id integer generated always as identity primary key,
  customer_id integer not null references user_accounts(id),
  project_id integer not null references design_projects(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, project_id)
);

create table if not exists availability_slots (
  id integer generated always as identity primary key,
  designer_id integer not null references user_accounts(id),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','BOOKED')),
  note text
);
create index if not exists idx_slots_designer_date on availability_slots(designer_id, slot_date);

create table if not exists issue_reports (
  id integer generated always as identity primary key,
  reporter_id integer not null references user_accounts(id),
  type text not null default 'OTHER' check (type in ('BUG','CONTENT','ACCOUNT','SPAM','OTHER')),
  subject text not null,
  description text not null,
  status text not null default 'PENDING' check (status in ('PENDING','REVIEWED','RECTIFIED')),
  resolution_note text,
  handled_by_id integer references user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
`;
