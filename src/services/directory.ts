// Public list of active Interior Designers and their companies.
import { one, type Db } from "../db";
import { NotFoundError, clean, escapeLike } from "../lib/errors";
import type { RatingSummary, User } from "../types";
import { getUser } from "./users";

export interface DesignerCard {
  id: number;
  fullName: string;
  companyName: string | null;
  specialties: string | null;
  description: string | null;
  projectCount: number;
  rating: RatingSummary;
}

export async function listDesigners(db: Db, q?: string | null, limit = 100): Promise<DesignerCard[]> {
  const params: unknown[] = [limit];
  let filter = "";
  const needle = clean(q);
  if (needle) {
    params.push(`%${escapeLike(needle.toLowerCase())}%`);
    filter = `and (lower(u.full_name) like $2 escape '\\' or lower(coalesce(c.name, '')) like $2 escape '\\')`;
  }
  const rows = await db.query<Omit<DesignerCard, "rating"> & { ratingAverage: number | null; ratingCount: number }>(
    `select u.id, u.full_name as "fullName", c.name as "companyName", c.specialties, c.description,
            (select count(*)::int from design_projects p where p.designer_id = u.id) as "projectCount",
            (select avg(r.score)::float8 from ratings r join design_projects p on p.id = r.project_id
              where p.designer_id = u.id and r.visible) as "ratingAverage",
            (select count(*)::int from ratings r join design_projects p on p.id = r.project_id
              where p.designer_id = u.id and r.visible) as "ratingCount"
       from user_accounts u left join companies c on c.designer_id = u.id
      where u.role = 'INTERIOR_DESIGNER' and u.status = 'ACTIVE' ${filter}
      order by lower(coalesce(c.name, u.full_name)), u.id
      limit $1::int`,
    params,
  );
  return rows.map(({ ratingAverage, ratingCount, ...rest }) => ({ ...rest, rating: { average: ratingAverage, count: ratingCount } }));
}

export async function getActiveDesigner(db: Db, id: number): Promise<User> {
  const user = await getUser(db, id);
  if (!user || user.role !== "INTERIOR_DESIGNER" || user.status !== "ACTIVE") throw new NotFoundError("Designer not found");
  return user;
}

export async function countActiveDesigners(db: Db): Promise<number> {
  return (await one<{ n: number }>(db, `select count(*)::int as n from user_accounts where role = 'INTERIOR_DESIGNER' and status = 'ACTIVE'`))?.n ?? 0;
}
