// Interior Design Projects (IDPs): the shared project queries.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean, escapeLike } from "../lib/errors";
import {
  type Project,
} from "../types";

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

export function featuredProjects(db: Db): Promise<Project[]> {
  return db.query<Project>(`${PROJECT_SELECT} where u.status = 'ACTIVE' order by p.view_count desc, p.created_at desc, p.id desc limit 6`);
}

// --------------------------------------------------------------- viewing

export function getProject(db: Db, id: number): Promise<Project | null> {
  return one<Project>(db, `${PROJECT_SELECT} where p.id = $1::int`, [id]);
}
