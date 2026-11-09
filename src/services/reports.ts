// Spec 6 - daily, weekly and monthly reports for Platform Management (Singapore time).
import { one, type Db } from "../db";
import { addDays, addMonths, fmtDayLong, fmtDate, fmtMonthLong, localMidnight, mondayIndex, todayLocal } from "../lib/dates";
import { PERIODS, PERIOD_INFO, isOneOf, type IssueStatus, type Period, type RatingSummary } from "../types";
import { issueCounts } from "./issues";
import { ratingForPlatform, topRatedProjects, type RankedProject } from "./projects";

export interface ReportRow {
  label: string;
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (exclusive)
  newUsers: number;
  newProjects: number;
  views: number;
  shortlists: number;
  issues: number;
  ratings: number;
}

export interface PlatformReport {
  period: Period;
  rows: ReportRow[]; // newest first; rows[0] is the current day / week / month
  current: ReportRow;
  topViewed: RankedProject[];
  topShortlisted: RankedProject[];
  topRated: RankedProject[];
  projectsByCategory: { label: string; count: number }[];
  issuesByStatus: Record<IssueStatus, number>;
  totalUsers: number;
  totalDesigners: number;
  totalCustomers: number;
  totalProjects: number;
  bannedUsers: number;
  platformRating: RatingSummary;
  maxViews: number;
  generatedAt: Date;
}

export function parsePeriod(value: string | undefined | null): Period {
  const upper = (value ?? "").toUpperCase();
  return isOneOf(PERIODS, upper) ? upper : "DAILY";
}

/** Newest first. Each range is [start, end). Weeks start on Monday. */
export function periodRanges(period: Period, today: string): { start: string; end: string }[] {
  let start = period === "DAILY" ? today : period === "WEEKLY" ? addDays(today, -mondayIndex(today)) : `${today.slice(0, 7)}-01`;
  const ranges: { start: string; end: string }[] = [];
  for (let i = 0; i < PERIOD_INFO[period].periods; i++) {
    const end = period === "DAILY" ? addDays(start, 1) : period === "WEEKLY" ? addDays(start, 7) : addMonths(start, 1);
    ranges.push({ start, end });
    start = period === "DAILY" ? addDays(start, -1) : period === "WEEKLY" ? addDays(start, -7) : addMonths(start, -1);
  }
  return ranges;
}

function label(period: Period, start: string): string {
  if (period === "DAILY") return fmtDayLong(start);
  if (period === "WEEKLY") return `Week of ${fmtDate(start)}`;
  return fmtMonthLong(start);
}

async function times(db: Db, sql: string, from: Date): Promise<number[]> {
  const rows = await db.query<{ t: Date }>(sql, [from]);
  return rows.map((r) => new Date(r.t).getTime());
}

export async function generateReport(db: Db, period: Period): Promise<PlatformReport> {
  const ranges = periodRanges(period, todayLocal());
  const from = localMidnight(ranges[ranges.length - 1].start);

  // One query per metric; rows are counted per period in memory.
  const [users, projects, views, shortlists, issues, ratings] = await Promise.all([
    times(db, `select created_at as t from user_accounts where created_at >= $1::timestamptz`, from),
    times(db, `select created_at as t from design_projects where created_at >= $1::timestamptz`, from),
    times(db, `select occurred_at as t from project_activities where type = 'VIEW' and occurred_at >= $1::timestamptz`, from),
    times(db, `select occurred_at as t from project_activities where type = 'SHORTLIST' and occurred_at >= $1::timestamptz`, from),
    times(db, `select created_at as t from issue_reports where created_at >= $1::timestamptz`, from),
    times(db, `select created_at as t from ratings where created_at >= $1::timestamptz`, from),
  ]);

  const rows: ReportRow[] = ranges.map(({ start, end }) => {
    const a = localMidnight(start).getTime();
    const b = localMidnight(end).getTime();
    const count = (list: number[]) => list.filter((t) => t >= a && t < b).length;
    return {
      label: label(period, start),
      start,
      end,
      newUsers: count(users),
      newProjects: count(projects),
      views: count(views),
      shortlists: count(shortlists),
      issues: count(issues),
      ratings: count(ratings),
    };
  });

  const currentStart = localMidnight(ranges[0].start);
  const ranked = (type: "VIEW" | "SHORTLIST") =>
    db.query<RankedProject>(
      `select p.id, p.title, count(*)::int as count, null::float8 as average
         from project_activities a join design_projects p on p.id = a.project_id
        where a.type = $1 and a.occurred_at >= $2::timestamptz
        group by p.id, p.title order by count desc, p.id limit 5`,
      [type, currentStart],
    );

  const [topViewed, topShortlisted, topRated, byCategory, issuesByStatus, totals, platformRating] = await Promise.all([
    ranked("VIEW"),
    ranked("SHORTLIST"),
    topRatedProjects(db, 5),
    db.query<{ label: string; count: number }>(
      `select coalesce(c.name, 'Uncategorised') as label, count(*)::int as count
         from design_projects p left join categories c on c.id = p.category_id
        group by c.name order by count desc, label`,
    ),
    issueCounts(db),
    one<{ users: number; designers: number; customers: number; banned: number; projects: number }>(
      db,
      `select (select count(*)::int from user_accounts) as users,
              (select count(*)::int from user_accounts where role = 'INTERIOR_DESIGNER') as designers,
              (select count(*)::int from user_accounts where role = 'CUSTOMER') as customers,
              (select count(*)::int from user_accounts where status = 'BANNED') as banned,
              (select count(*)::int from design_projects) as projects`,
    ),
    ratingForPlatform(db),
  ]);

  return {
    period,
    rows,
    current: rows[0],
    topViewed,
    topShortlisted,
    topRated,
    projectsByCategory: byCategory,
    issuesByStatus,
    totalUsers: totals?.users ?? 0,
    totalDesigners: totals?.designers ?? 0,
    totalCustomers: totals?.customers ?? 0,
    totalProjects: totals?.projects ?? 0,
    bannedUsers: totals?.banned ?? 0,
    platformRating,
    maxViews: Math.max(1, ...rows.map((r) => r.views)),
    generatedAt: new Date(),
  };
}

/** CSV export of the report rows (opens in Excel / Google Sheets). */
export function reportToCsv(report: PlatformReport): string {
  const lines = ["Period,Start,End (exclusive),New users,New projects,Project views,Shortlists,Issues reported,Ratings"];
  for (const r of report.rows) {
    lines.push([`"${r.label}"`, r.start, r.end, r.newUsers, r.newProjects, r.views, r.shortlists, r.issues, r.ratings].join(","));
  }
  return lines.join("\n") + "\n";
}
