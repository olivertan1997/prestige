// Demo accounts and sample content, created the first time the database is set up (if a seed password is given).
import { one, type Db } from "../db";
import { addDays, todayLocal } from "../lib/dates";
import type { IssueStatus, IssueType, ProjectStatus, Role } from "../types";
import { ensureDefaultCategories } from "./catalog";
import { createUser, ensureProfiles, findUserByUsername } from "./users";

export const DEMO_USERNAMES = ["admin", "platform", "sophia", "marcus", "emily", "daniel"];

/** Small deterministic random generator so the demo data is the same on every fresh database. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function seedDemoData(db: Db, password: string): Promise<boolean> {
  await ensureProfiles(db);
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

  const company = (designerId: number, values: unknown[]) =>
    db.query(
      `insert into companies (designer_id, name, registration_number, description, address, phone, email, website, years_in_business, specialties)
       values ($1::int, $2, $3, $4, $5, $6, $7, $8, $9::int, $10) on conflict (designer_id) do nothing`,
      [designerId, ...values],
    );
  await company(sophia.id, [
    "Atelier Tan Interiors", "201912345K",
    "Award-winning residential studio known for calm, light-filled homes that balance Scandinavian simplicity with warm Asian craftsmanship.",
    "21 Bukit Timah Road, #03-02", "+65 6123 4567", "hello@ateliertan.example.com", "https://ateliertan.example.com", 9,
    "Scandinavian, Japandi, HDB & condo renovation",
  ]);
  await company(marcus.id, [
    "Lee & Lumen Design Studio", "201554321M",
    "Commercial and luxury residential interiors with a focus on lighting, bespoke joinery and statement materials.",
    "88 Tanjong Pagar Road, #02-01", "+65 6987 6543", "studio@leelumen.example.com", "https://leelumen.example.com", 12,
    "Modern luxury, industrial, offices, F&B",
  ]);

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

  // Historical views so the reports and dashboards have data on day one (one bulk insert per project).
  const random = seededRandom(42);
  const now = Date.now();
  for (const p of [p1, p2, p3, p4, p5, p6, p7]) {
    const count = 8 + Math.floor(random() * 22);
    const stamps = Array.from({ length: count }, () => new Date(now - Math.floor(random() * p.ageDays * 24 * 3600 * 1000)).toISOString());
    await db.query(
      `insert into project_activities (project_id, type, occurred_at)
       select $1::int, 'VIEW', t::timestamptz from unnest(string_to_array($2, ',')) as t`,
      [p.id, stamps.join(",")],
    );
    await db.query(`update design_projects set view_count = $2::int where id = $1::int`, [p.id, count]);
  }

  const favourite = async (customerId: number, projectId: number, daysAgo: number) => {
    await db.query(
      `with ins as (insert into favourites (customer_id, project_id, created_at) values ($1::int, $2::int, now() - $3::int * interval '1 day')
                    on conflict do nothing returning project_id, created_at)
       , upd as (update design_projects set shortlist_count = shortlist_count + 1 where id in (select project_id from ins))
       insert into project_activities (project_id, user_id, type, occurred_at) select project_id, $1::int, 'SHORTLIST', created_at from ins`,
      [customerId, projectId, daysAgo],
    );
  };
  await favourite(emily.id, p1.id, 20);
  await favourite(emily.id, p3.id, 6);
  await favourite(daniel.id, p1.id, 9);
  await favourite(daniel.id, p5.id, 3);
  await favourite(daniel.id, p7.id, 1);

  const rating = (customerId: number, projectId: number, score: number, comment: string) =>
    db.query(`insert into ratings (customer_id, project_id, score, comment) values ($1::int, $2::int, $3::int, $4) on conflict do nothing`,
      [customerId, projectId, score, comment]);
  await rating(emily.id, p1.id, 5, "Sophia's team was incredibly detailed - our flat feels twice as big.");
  await rating(daniel.id, p1.id, 4, "Beautiful result, small delays with the carpentry.");
  await rating(daniel.id, p5.id, 5, "Exactly the luxury feel we wanted.");
  await rating(emily.id, p4.id, 4, "Smart storage ideas throughout.");

  // Availability for the next six weeks (bulk insert per designer).
  const availability = async (designerId: number, weekdays: number[], times: [string, string][]) => {
    const dates: string[] = [], starts: string[] = [], ends: string[] = [], statuses: string[] = [];
    let n = 0;
    for (let i = 1; i <= 42; i++) {
      const day = addDays(todayLocal(), i);
      if (!weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay())) continue;
      for (const [start, end] of times) {
        dates.push(day);
        starts.push(start);
        ends.push(end);
        statuses.push(n++ % 4 === 1 ? "BOOKED" : "AVAILABLE");
      }
    }
    await db.query(
      `insert into availability_slots (designer_id, slot_date, start_time, end_time, status, note)
       select $1::int, d::date, s::time, e::time, st, 'Consultation / site visit'
         from unnest(string_to_array($2, ','), string_to_array($3, ','), string_to_array($4, ','), string_to_array($5, ',')) as t(d, s, e, st)`,
      [designerId, dates.join(","), starts.join(","), ends.join(","), statuses.join(",")],
    );
  };
  await availability(sophia.id, [1, 3, 5], [["10:00", "12:00"], ["14:00", "17:00"]]);
  await availability(marcus.id, [2, 4, 6], [["09:30", "12:30"]]);

  const issue = (reporterId: number, type: IssueType, subject: string, description: string, status: IssueStatus,
    note: string | null, handlerId: number | null) =>
    db.query(
      `insert into issue_reports (reporter_id, type, subject, description, status, resolution_note, handled_by_id, resolved_at)
       values ($1::int, $2, $3, $4, $5, $6, $7::int, case when $5 = 'RECTIFIED' then now() - interval '1 day' else null end)`,
      [reporterId, type, subject, description, status, note, handlerId],
    );
  await issue(emily.id, "BUG", "Project images load slowly", "Some project pages take a long time to show the cover image on my phone.", "PENDING", null, null);
  await issue(daniel.id, "ACCOUNT", "Could not update my phone number", "Saving my profile showed an error the first time.", "REVIEWED",
    "Thanks Daniel - we are looking into it.", admin.id);
  await issue(emily.id, "SPAM", "Suspicious account sending links", "A user called 'promo_bot_88' keeps posting the same link.", "RECTIFIED",
    "The account has been banned. Thank you for flagging it!", platform.id);
  return true;
}
