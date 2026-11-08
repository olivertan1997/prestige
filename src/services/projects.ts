// Story 1 (keyword search) and the shared project queries.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean, escapeLike } from "../lib/errors";
import {
  PROJECT_STATUSES,
  isOneOf,
  type Project,
} from "../types";

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
    search.sort === "title" ? "lower(p.title) asc, p.id asc"
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
