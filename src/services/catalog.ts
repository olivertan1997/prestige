// Spec 2 (company information) and IDP categories.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import type { Category, Company } from "../types";
import { requireUser } from "./users";

// ------------------------------------------------------------------ companies

const COMPANY_COLS = `id, designer_id as "designerId", name, registration_number as "registrationNumber", description, address,
  phone, email, website, years_in_business as "yearsInBusiness", specialties, updated_at as "updatedAt"`;

export interface CompanyInput {
  name?: string;
  registrationNumber?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  yearsInBusiness?: string;
  specialties?: string;
}

export function getCompany(db: Db, designerId: number): Promise<Company | null> {
  return one<Company>(db, `select ${COMPANY_COLS} from companies where designer_id = $1::int`, [designerId]);
}

/** Field-level validation for the company form. */
export function validateCompany(input: CompanyInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = clean(input.name);
  if (!name) errors.name = "Company name is required";
  else if (name.length > 120) errors.name = "At most 120 characters";
  const email = clean(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
  const website = clean(input.website);
  if (website && !/^https?:\/\/.+/i.test(website)) errors.website = "Website must start with http:// or https://";
  const years = clean(input.yearsInBusiness);
  if (years && (!/^\d{1,3}$/.test(years) || Number(years) > 200)) errors.yearsInBusiness = "Enter a number between 0 and 200";
  if ((clean(input.description) ?? "").length > 2000) errors.description = "At most 2000 characters";
  return errors;
}

/** Creates the company the first time, updates it afterwards. */
export async function saveCompany(db: Db, designerId: number, input: CompanyInput): Promise<Company> {
  const designer = await requireUser(db, designerId);
  if (designer.role !== "INTERIOR_DESIGNER") throw new BusinessError("Only Interior Designers have company information.");
  const errors = validateCompany(input);
  const first = Object.values(errors)[0];
  if (first) throw new BusinessError(first + ".");
  const years = clean(input.yearsInBusiness);
  const saved = await one<Company>(
    db,
    `insert into companies (designer_id, name, registration_number, description, address, phone, email, website, years_in_business, specialties)
     values ($1::int, $2, $3, $4, $5, $6, $7, $8, $9::int, $10)
     on conflict (designer_id) do update set name = excluded.name, registration_number = excluded.registration_number,
       description = excluded.description, address = excluded.address, phone = excluded.phone, email = excluded.email,
       website = excluded.website, years_in_business = excluded.years_in_business, specialties = excluded.specialties,
       updated_at = now()
     returning ${COMPANY_COLS}`,
    [
      designerId,
      clean(input.name),
      clean(input.registrationNumber),
      clean(input.description),
      clean(input.address),
      clean(input.phone),
      clean(input.email),
      clean(input.website),
      years === null ? null : Number(years),
      clean(input.specialties),
    ],
  );
  return saved!;
}

// ----------------------------------------------------------------- categories

const CATEGORY_COLS = `id, name, description, active, created_at as "createdAt"`;

export const DEFAULT_CATEGORIES: [string, string][] = [
  ["Living Room", "Living and family spaces"],
  ["Bedroom", "Master bedrooms, kids' rooms and guest rooms"],
  ["Kitchen", "Kitchens, pantries and dining areas"],
  ["Bathroom", "Bathrooms, powder rooms and wet areas"],
  ["Whole Home", "Complete renovation of an apartment or house"],
  ["Office / Commercial", "Workplaces, studios and co-working spaces"],
  ["Retail & F&B", "Shops, cafes, restaurants and showrooms"],
];

export function listCategories(db: Db): Promise<Category[]> {
  return db.query<Category>(`select ${CATEGORY_COLS} from categories order by lower(name), id`);
}

export function listActiveCategories(db: Db): Promise<Category[]> {
  return db.query<Category>(`select ${CATEGORY_COLS} from categories where active order by lower(name), id`);
}

export async function getCategory(db: Db, id: number): Promise<Category> {
  const category = await one<Category>(db, `select ${CATEGORY_COLS} from categories where id = $1::int`, [id]);
  if (!category) throw new NotFoundError("Category not found");
  return category;
}

function requireName(name: string | undefined | null): string {
  const value = clean(name);
  if (!value) throw new BusinessError("Category name is required.");
  if (value.length > 60) throw new BusinessError("Category names can be at most 60 characters.");
  return value;
}

export async function createCategory(db: Db, name: string, description?: string | null): Promise<Category> {
  const value = requireName(name);
  if (await one(db, `select 1 from categories where lower(name) = lower($1)`, [value])) {
    throw new BusinessError(`A category called '${value}' already exists.`);
  }
  const created = await one<Category>(
    db,
    `insert into categories (name, description) values ($1, $2) returning ${CATEGORY_COLS}`,
    [value, clean(description)],
  );
  return created!;
}

export async function ensureDefaultCategories(db: Db): Promise<void> {
  const existing = await one<{ count: number }>(db, `select count(*)::int as count from categories`);
  if (existing && existing.count > 0) return;
  for (const [name, description] of DEFAULT_CATEGORIES) {
    await db.query(`insert into categories (name, description) values ($1, $2) on conflict (name) do nothing`, [name, description]);
  }
}
