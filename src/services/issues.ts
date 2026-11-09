// Story 3 - report issues and follow their status.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import { ISSUE_TYPES, isOneOf, type Issue } from "../types";
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
