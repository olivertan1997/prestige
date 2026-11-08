// Database schema for Supabase PostgreSQL. Safe to run many times (everything is "if not exists").
// Run by scripts/migrate.ts during each deploy, and by the test suite on its in-memory database.

export const SCHEMA_SQL = `
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
`;
