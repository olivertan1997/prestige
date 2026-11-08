// Demo accounts and sample content, created the first time the database is set up (if a seed password is given).
import { one, type Db } from "../db";
import { addDays, todayLocal } from "../lib/dates";
import type { ProjectStatus, Role } from "../types";
import { ensureDefaultCategories } from "./catalog";
import { createUser, findUserByUsername } from "./users";

export const DEMO_USERNAMES = ["admin", "platform", "sophia", "marcus", "emily", "daniel"];

export async function seedDemoData(db: Db, password: string): Promise<boolean> {
  await ensureDefaultCategories(db);
  if (await findUserByUsername(db, "sophia")) return false; // already seeded

  const ensure = async (username: string, fullName: string, role: Role, ageDays: number) => {
    const existing = await findUserByUsername(db, username);
    const user = existing ?? (await createUser(db, { username, email: `${username}@example.com`, fullName, password, role }));
    await db.query(`update user_accounts set created_at = now() - $2::int * interval '1 day' where id = $1::int`, [user.id, ageDays]);
    return user;
  };
  const admin = await ensure("admin", "Aaron Lim", "USER_ADMIN", 150);
  const platform = await ensure("platform", "Priya Nair", "PLATFORM_MANAGEMENT", 150);
  const sophia = await ensure("sophia", "Sophia Tan", "INTERIOR_DESIGNER", 130);
  const marcus = await ensure("marcus", "Marcus Lee", "INTERIOR_DESIGNER", 125);
  const emily = await ensure("emily", "Emily Chen", "CUSTOMER", 40);
  const daniel = await ensure("daniel", "Daniel Ng", "CUSTOMER", 10);

  const project = async (designerId: number, category: string, title: string, style: string, location: string,
    budget: number, status: ProjectStatus, ageDays: number, description: string) => {
    const row = await one<{ id: number }>(
      db,
      `insert into design_projects (designer_id, category_id, title, style, location, budget, status, description,
         created_at, updated_at, start_date, end_date)
       values ($1::int, (select id from categories where name = $2), $3, $4, $5, $6::numeric, $7, $8,
         now() - $9::int * interval '1 day', now() - $9::int * interval '1 day', $10::date, $11::date)
       returning id`,
      [designerId, category, title, style, location, budget, status, description, ageDays,
        addDays(todayLocal(), -(ageDays + 20)), status === "PAST" ? addDays(todayLocal(), -Math.max(1, ageDays - 30)) : null],
    );
    return { id: row!.id, ageDays };
  };

  const p1 = await project(sophia.id, "Living Room", "Scandinavian Calm - 4-Room HDB Living Room", "Scandinavian", "Tampines", 28000, "PAST", 118,
    "A bright, airy living space with white oak flooring, linen textures and hidden storage walls. We opened up the kitchen wall to create a seamless family area.");
  const p2 = await project(sophia.id, "Kitchen", "Japandi Kitchen and Dining Revamp", "Japandi", "Bishan", 32000, "CURRENT", 60,
    "Warm timber cabinetry, a quartz island for casual dining and soft indirect lighting. Currently in the carpentry phase.");
  const p3 = await project(sophia.id, "Bathroom", "Resort-style Bathroom Retreat", "Tropical resort", "Sentosa Cove", 18500, "CURRENT", 25,
    "Stone-look porcelain, a walk-in rain shower and teak accents bring a boutique-hotel feel home.");
  const p4 = await project(sophia.id, "Whole Home", "Minimalist Whole-Home Makeover - 5-Room Flat", "Minimalist", "Punggol", 75000, "PAST", 95,
    "A complete renovation for a young family: clean lines, a neutral palette and clever built-ins in every room.");
  const p5 = await project(marcus.id, "Bedroom", "Modern Luxe Penthouse Master Suite", "Modern luxury", "Orchard", 65000, "PAST", 110,
    "Velvet upholstered headboard wall, brushed brass details and a walk-in wardrobe with integrated lighting.");
  const p6 = await project(marcus.id, "Office / Commercial", "Industrial Loft Office for a Creative Agency", "Industrial", "Tanjong Pagar", 120000, "PAST", 80,
    "Exposed ceilings, black steel frames and acoustic timber baffles for a 40-person creative team.");
  const p7 = await project(marcus.id, "Retail & F&B", "Boutique Cafe Interior", "Contemporary", "Joo Chiat", 54000, "CURRENT", 15,
    "Terrazzo counters, curved banquettes and a living plant wall for a neighbourhood specialty cafe.");
  return true;
}
