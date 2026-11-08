// IDP categories.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import type { Category } from "../types";

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
