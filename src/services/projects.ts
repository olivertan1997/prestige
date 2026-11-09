// Spec 3 (portfolio), spec 4 + story 1 (search / view / save), spec 5 + story 7 (interest tracking)
// and story 4 (favourites).
import { one, type Db } from "../db";
import { isValidDate } from "../lib/dates";
import { BusinessError, NotFoundError, clean, escapeLike } from "../lib/errors";
import {
  PROJECT_STATUSES,
  isOneOf,
  type Project,
  type ProjectStatus,
  type SessionUser,
} from "../types";
import { requireUser } from "./users";

export const PAGE_SIZE = 12;

const PROJECT_SELECT = `
  select p.id, p.designer_id as "designerId", u.full_name as "designerName", u.status as "designerStatus",
         p.category_id as "categoryId", c.name as "categoryName", c.active as "categoryActive",
         p.title, p.description, p.style, p.location, p.budget::float8 as budget, p.status,
         p.start_date::text as "startDate", p.end_date::text as "endDate", p.image_url as "imageUrl",
         p.view_count as "viewCount", p.shortlist_count as "shortlistCount",
         p.created_at as "createdAt", p.updated_at as "updatedAt"
    from design_projects p
    join user_accounts u on u.id = p.designer_id
    left join categories c on c.id = p.category_id`;

// ---------------------------------------------------------------- search

export interface ProjectSearch {
  q?: string | null;
  categoryId?: number | null;
  status?: string | null;
  sort?: string | null;
  page?: number;
}

export interface ProjectPage {
  items: Project[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Keyword search over title, description, style, location, category and designer name.
 * Every word must match somewhere (case-insensitive). Projects of banned/disabled designers are excluded.
 */
export async function searchProjects(db: Db, search: ProjectSearch = {}): Promise<ProjectPage> {
  const where = [`u.status = 'ACTIVE'`];
  const params: unknown[] = [];
  const q = clean(search.q);
  if (q) {
    for (const term of q.toLowerCase().split(/\s+/).slice(0, 8)) {
      params.push(`%${escapeLike(term)}%`);
      const n = `$${params.length}`;
      where.push(`(lower(p.title) like ${n} escape '\\' or lower(coalesce(p.description, '')) like ${n} escape '\\'
        or lower(coalesce(p.style, '')) like ${n} escape '\\' or lower(coalesce(p.location, '')) like ${n} escape '\\'
        or lower(coalesce(c.name, '')) like ${n} escape '\\' or lower(u.full_name) like ${n} escape '\\')`);
    }
  }
  if (search.categoryId) {
    params.push(search.categoryId);
    where.push(`p.category_id = $${params.length}::int`);
  }
  if (isOneOf(PROJECT_STATUSES, search.status)) {
    params.push(search.status);
    where.push(`p.status = $${params.length}`);
  }
  const order =
    search.sort === "views" ? "p.view_count desc, p.id desc"
    : search.sort === "shortlisted" ? "p.shortlist_count desc, p.id desc"
    : search.sort === "title" ? "lower(p.title) asc, p.id asc"
    : "p.created_at desc, p.id desc";
  const clause = where.join(" and ");
  const countRow = await one<{ total: number }>(
    db,
    `select count(*)::int as total from design_projects p join user_accounts u on u.id = p.designer_id
       left join categories c on c.id = p.category_id where ${clause}`,
    params,
  );
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(0, search.page ?? 0), totalPages - 1);
  const items = await db.query<Project>(
    `${PROJECT_SELECT} where ${clause} order by ${order} limit ${PAGE_SIZE} offset ${page * PAGE_SIZE}`,
    params,
  );
  return { items, total, page, totalPages };
}

export function featuredProjects(db: Db): Promise<Project[]> {
  return db.query<Project>(`${PROJECT_SELECT} where u.status = 'ACTIVE' order by p.view_count desc, p.created_at desc, p.id desc limit 6`);
}

// --------------------------------------------------------------- viewing

export function getProject(db: Db, id: number): Promise<Project | null> {
  return one<Project>(db, `${PROJECT_SELECT} where p.id = $1::int`, [id]);
}

/** Projects of banned or disabled designers are hidden, except from their owner and staff. */
export async function getProjectForViewer(db: Db, id: number, viewer: SessionUser | null): Promise<Project> {
  const project = await getProject(db, id);
  if (!project) throw new NotFoundError("Project not found");
  if (project.designerStatus !== "ACTIVE") {
    const owner = viewer?.id === project.designerId;
    const staff = viewer?.role === "USER_ADMIN" || viewer?.role === "PLATFORM_MANAGEMENT";
    if (!owner && !staff) throw new NotFoundError("Project not found");
  }
  return project;
}

/** Spec 5 - counts one view. A designer looking at their own project is not counted. */
export async function recordView(db: Db, projectId: number, viewerId: number | null): Promise<boolean> {
  const project = await one<{ designerId: number }>(db, `select designer_id as "designerId" from design_projects where id = $1::int`, [projectId]);
  if (!project || project.designerId === viewerId) return false;
  await db.query(
    `with upd as (update design_projects set view_count = view_count + 1 where id = $1::int returning id)
     insert into project_activities (project_id, user_id, type) select id, $2::int, 'VIEW' from upd`,
    [projectId, viewerId],
  );
  return true;
}

// ------------------------------------------------------------- portfolio

export interface ProjectInput {
  title?: string;
  description?: string;
  categoryId?: string;
  style?: string;
  location?: string;
  budget?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
}

/** Field-level validation for the project form (spec 3). */
export function validateProject(input: ProjectInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = clean(input.title);
  if (!title) errors.title = "Title is required";
  else if (title.length > 150) errors.title = "At most 150 characters";
  if (!clean(input.categoryId) || !/^\d+$/.test(input.categoryId!.trim())) errors.categoryId = "Choose a category";
  if (!isOneOf(PROJECT_STATUSES, input.status)) errors.status = "Choose current or past";
  const budget = clean(input.budget);
  if (budget && (!/^\d{1,10}(\.\d{1,2})?$/.test(budget))) errors.budget = "Enter a positive amount, e.g. 25000";
  const start = clean(input.startDate);
  const end = clean(input.endDate);
  if (start && !isValidDate(start)) errors.startDate = "Enter a valid date";
  if (end && !isValidDate(end)) errors.endDate = "Enter a valid date";
  if (start && end && isValidDate(start) && isValidDate(end) && end < start) errors.endDate = "The end date cannot be before the start date";
  const image = clean(input.imageUrl);
  if (image && (!/^https?:\/\/.+/i.test(image) || image.length > 500)) errors.imageUrl = "Image URL must start with http:// or https://";
  if ((clean(input.description) ?? "").length > 4000) errors.description = "At most 4000 characters";
  return errors;
}

async function checkedValues(db: Db, input: ProjectInput, currentCategoryId: number | null) {
  const errors = validateProject(input);
  const first = Object.values(errors)[0];
  if (first) throw new BusinessError(first + ".");
  const categoryId = Number(input.categoryId);
  const category = await one<{ name: string; active: boolean }>(db, `select name, active from categories where id = $1::int`, [categoryId]);
  if (!category) throw new BusinessError("Please choose a valid category.");
  if (!category.active && categoryId !== currentCategoryId) {
    throw new BusinessError(`The category '${category.name}' is no longer available.`);
  }
  const budget = clean(input.budget);
  return [
    clean(input.title),
    clean(input.description),
    categoryId,
    clean(input.style),
    clean(input.location),
    budget === null ? null : budget,
    input.status as ProjectStatus,
    clean(input.startDate),
    clean(input.endDate),
    clean(input.imageUrl),
  ];
}

export async function createProject(db: Db, designerId: number, input: ProjectInput): Promise<Project> {
  const designer = await requireUser(db, designerId);
  if (designer.role !== "INTERIOR_DESIGNER") throw new BusinessError("Only Interior Designers can add projects.");
  const values = await checkedValues(db, input, null);
  const row = await one<{ id: number }>(
    db,
    `insert into design_projects (designer_id, title, description, category_id, style, location, budget, status, start_date, end_date, image_url)
     values ($1::int, $2, $3, $4::int, $5, $6, $7::numeric, $8, $9::date, $10::date, $11) returning id`,
    [designerId, ...values],
  );
  return (await getProject(db, row!.id))!;
}

export async function getOwnedProject(db: Db, designerId: number, projectId: number): Promise<Project> {
  const project = await getProject(db, projectId);
  if (!project) throw new NotFoundError("Project not found");
  if (project.designerId !== designerId) throw new BusinessError("You can only manage your own projects.");
  return project;
}

export async function updateProject(db: Db, designerId: number, projectId: number, input: ProjectInput): Promise<Project> {
  const project = await getOwnedProject(db, designerId, projectId);
  const values = await checkedValues(db, input, project.categoryId);
  await db.query(
    `update design_projects set title = $2, description = $3, category_id = $4::int, style = $5, location = $6,
       budget = $7::numeric, status = $8, start_date = $9::date, end_date = $10::date, image_url = $11, updated_at = now()
     where id = $1::int`,
    [projectId, ...values],
  );
  return (await getProject(db, projectId))!;
}

/** Deleting a project also removes its favourites, views and ratings (ON DELETE CASCADE). */
export async function deleteProject(db: Db, designerId: number, projectId: number): Promise<void> {
  await getOwnedProject(db, designerId, projectId);
  await db.query(`delete from design_projects where id = $1::int`, [projectId]);
}

export function listDesignerProjects(db: Db, designerId: number): Promise<Project[]> {
  return db.query<Project>(`${PROJECT_SELECT} where p.designer_id = $1::int order by p.created_at desc, p.id desc`, [designerId]);
}

// ------------------------------------------------------------ statistics

export interface ProjectStats {
  id: number;
  title: string;
  status: ProjectStatus;
  categoryName: string | null;
  /** Total number of views. */
  views: number;
  /** Total number of times shortlisted (saved to a favourites list). */
  shortlists: number;
  /** Customers who still have it in their favourites. */
  currentFavourites: number;
  views30: number;
  shortlists30: number;
}

/** Spec 5 / story 7 - views and shortlist counts for each of a designer's projects. */
export async function statsForDesigner(db: Db, designerId: number): Promise<ProjectStats[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  return db.query<ProjectStats>(
    `select p.id, p.title, p.status, c.name as "categoryName", p.view_count as views, p.shortlist_count as shortlists,
            (select count(*)::int from favourites f where f.project_id = p.id) as "currentFavourites",
            (select count(*)::int from project_activities a where a.project_id = p.id and a.type = 'VIEW' and a.occurred_at >= $2::timestamptz) as views30,
            (select count(*)::int from project_activities a where a.project_id = p.id and a.type = 'SHORTLIST' and a.occurred_at >= $2::timestamptz) as shortlists30
       from design_projects p left join categories c on c.id = p.category_id
      where p.designer_id = $1::int
      order by p.created_at desc, p.id desc`,
    [designerId, since],
  );
}

// ------------------------------------------------------------ favourites

async function requireCustomer(db: Db, customerId: number, action: string) {
  const customer = await requireUser(db, customerId);
  if (customer.role !== "CUSTOMER") throw new BusinessError(`Only customers can ${action}.`);
  return customer;
}

async function requireVisibleProject(db: Db, projectId: number): Promise<Project> {
  const project = await getProject(db, projectId);
  if (!project || project.designerStatus !== "ACTIVE") throw new NotFoundError("Project not found");
  return project;
}

/** Story 4 - save to favourites. Each new save adds one to the project's shortlist count (story 7). */
export async function addFavourite(db: Db, customerId: number, projectId: number): Promise<boolean> {
  await requireCustomer(db, customerId, "save projects to favourites");
  await requireVisibleProject(db, projectId);
  const row = await one<{ added: number }>(
    db,
    `with ins as (
        insert into favourites (customer_id, project_id) values ($1::int, $2::int)
        on conflict (customer_id, project_id) do nothing returning project_id),
      upd as (update design_projects set shortlist_count = shortlist_count + 1 where id in (select project_id from ins) returning id),
      act as (insert into project_activities (project_id, user_id, type) select project_id, $1::int, 'SHORTLIST' from ins returning id)
     select (select count(*)::int from ins) as added`,
    [customerId, projectId],
  );
  return (row?.added ?? 0) > 0;
}

/** Removing a favourite does not reduce the historical shortlist count. */
export async function removeFavourite(db: Db, customerId: number, projectId: number): Promise<boolean> {
  const rows = await db.query(`delete from favourites where customer_id = $1::int and project_id = $2::int returning id`, [customerId, projectId]);
  return rows.length > 0;
}

export function listFavourites(db: Db, customerId: number): Promise<(Project & { savedAt: Date })[]> {
  return db.query(
    `${PROJECT_SELECT} join favourites f on f.project_id = p.id
      where f.customer_id = $1::int order by f.created_at desc, f.id desc`.replace("select p.id,", `select f.created_at as "savedAt", p.id,`),
    [customerId],
  );
}

export async function favouriteIds(db: Db, customerId: number): Promise<Set<number>> {
  const rows = await db.query<{ id: number }>(`select project_id as id from favourites where customer_id = $1::int`, [customerId]);
  return new Set(rows.map((r) => r.id));
}

export async function isFavourite(db: Db, customerId: number, projectId: number): Promise<boolean> {
  return !!(await one(db, `select 1 from favourites where customer_id = $1::int and project_id = $2::int`, [customerId, projectId]));
}

export async function currentFavouriteCount(db: Db, projectId: number): Promise<number> {
  return (await one<{ count: number }>(db, `select count(*)::int as count from favourites where project_id = $1::int`, [projectId]))?.count ?? 0;
}
