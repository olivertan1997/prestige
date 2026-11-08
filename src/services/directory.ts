// Public list of active Interior Designers and their companies.
import { one, type Db } from "../db";
import { NotFoundError, clean, escapeLike } from "../lib/errors";
import type { User } from "../types";
import { getUser } from "./users";

export interface DesignerCard {
  id: number;
  fullName: string;
  companyName: string | null;
  specialties: string | null;
  description: string | null;
  projectCount: number;
}

export async function listDesigners(db: Db, q?: string | null, limit = 100): Promise<DesignerCard[]> {
  const params: unknown[] = [limit];
  let filter = "";
  const needle = clean(q);
  if (needle) {
    params.push(`%${escapeLike(needle.toLowerCase())}%`);
    filter = `and (lower(u.full_name) like $2 escape '\\' or lower(coalesce(c.name, '')) like $2 escape '\\')`;
  }
  return db.query<DesignerCard>(
    `select u.id, u.full_name as "fullName", c.name as "companyName", c.specialties, c.description,
            (select count(*)::int from design_projects p where p.designer_id = u.id) as "projectCount"
       from user_accounts u left join companies c on c.designer_id = u.id
      where u.role = 'INTERIOR_DESIGNER' and u.status = 'ACTIVE' ${filter}
      order by lower(coalesce(c.name, u.full_name)), u.id
      limit $1::int`,
    params,
  );
}

export async function getActiveDesigner(db: Db, id: number): Promise<User> {
  const user = await getUser(db, id);
  if (!user || user.role !== "INTERIOR_DESIGNER" || user.status !== "ACTIVE") throw new NotFoundError("Designer not found");
  return user;
}

export async function countActiveDesigners(db: Db): Promise<number> {
  return (await one<{ n: number }>(db, `select count(*)::int as n from user_accounts where role = 'INTERIOR_DESIGNER' and status = 'ACTIVE'`))?.n ?? 0;
}
