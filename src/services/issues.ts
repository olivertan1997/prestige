// Story 3 (report issues), story 11 (view flagged reports), story 12 (mark as Rectified).
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import { ISSUE_STATUSES, ISSUE_TYPES, isOneOf, type Issue, type IssueStatus } from "../types";
import { requireUser } from "./users";

const ISSUE_SELECT = `
  select i.id, i.reporter_id as "reporterId", r.full_name as "reporterName", r.role as "reporterRole", i.type, i.subject,
         i.description, i.status, i.resolution_note as "resolutionNote", i.handled_by_id as "handledById",
         h.full_name as "handledByName", i.created_at as "createdAt", i.updated_at as "updatedAt", i.resolved_at as "resolvedAt"
    from issue_reports i
    join user_accounts r on r.id = i.reporter_id
    left join user_accounts h on h.id = i.handled_by_id`;

export interface IssueInput {
  type?: string;
  subject?: string;
  description?: string;
}

export function validateIssue(input: IssueInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isOneOf(ISSUE_TYPES, input.type)) errors.type = "Choose an issue type";
  const subject = clean(input.subject);
  if (!subject) errors.subject = "Subject is required";
  else if (subject.length > 150) errors.subject = "At most 150 characters";
  const description = clean(input.description);
  if (!description) errors.description = "Please describe the issue";
  else if (description.length > 2000) errors.description = "At most 2000 characters";
  return errors;
}

export async function reportIssue(db: Db, reporterId: number, input: IssueInput): Promise<Issue> {
  await requireUser(db, reporterId);
  const first = Object.values(validateIssue(input))[0];
  if (first) throw new BusinessError(first + ".");
  const row = await one<{ id: number }>(
    db,
    `insert into issue_reports (reporter_id, type, subject, description) values ($1::int, $2, $3, $4) returning id`,
    [reporterId, input.type, clean(input.subject), clean(input.description)],
  );
  return (await getIssue(db, row!.id))!;
}

export function getIssue(db: Db, id: number): Promise<Issue | null> {
  return one<Issue>(db, `${ISSUE_SELECT} where i.id = $1::int`, [id]);
}

export function myIssues(db: Db, reporterId: number): Promise<Issue[]> {
  return db.query<Issue>(`${ISSUE_SELECT} where i.reporter_id = $1::int order by i.created_at desc, i.id desc`, [reporterId]);
}

export function listIssues(db: Db, status?: string | null): Promise<Issue[]> {
  if (isOneOf(ISSUE_STATUSES, status)) {
    return db.query<Issue>(`${ISSUE_SELECT} where i.status = $1 order by i.created_at desc, i.id desc`, [status]);
  }
  return db.query<Issue>(`${ISSUE_SELECT} order by i.created_at desc, i.id desc`);
}

export async function updateIssueStatus(db: Db, handlerId: number, issueId: number, status: string, note?: string | null): Promise<Issue> {
  if (!isOneOf(ISSUE_STATUSES, status)) throw new BusinessError("Choose a status.");
  const handler = await requireUser(db, handlerId);
  if (handler.role !== "USER_ADMIN" && handler.role !== "PLATFORM_MANAGEMENT") {
    throw new BusinessError("Only User Admins and Platform Management can update reports.");
  }
  if (!(await getIssue(db, issueId))) throw new NotFoundError("Issue not found");
  await db.query(
    `update issue_reports set status = $2, handled_by_id = $3::int, resolution_note = coalesce($4, resolution_note),
       resolved_at = case when $2 = 'RECTIFIED' then now() else null end, updated_at = now()
     where id = $1::int`,
    [issueId, status, handlerId, clean(note)],
  );
  return (await getIssue(db, issueId))!;
}

export async function issueCounts(db: Db): Promise<Record<IssueStatus, number>> {
  const rows = await db.query<{ status: IssueStatus; count: number }>(`select status, count(*)::int as count from issue_reports group by status`);
  const counts = Object.fromEntries(ISSUE_STATUSES.map((s) => [s, 0])) as Record<IssueStatus, number>;
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}
