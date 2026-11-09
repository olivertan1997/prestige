// Shared domain types and value lists for Prestige Interior Design.

export const ROLES = ["USER_ADMIN", "INTERIOR_DESIGNER", "CUSTOMER", "PLATFORM_MANAGEMENT"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  USER_ADMIN: "User Admin",
  INTERIOR_DESIGNER: "Interior Designer",
  CUSTOMER: "Customer",
  PLATFORM_MANAGEMENT: "Platform Management",
};
/** Roles a visitor may choose when signing up. Staff accounts are created by a User Admin. */
export const SELF_SERVICE_ROLES: Role[] = ["CUSTOMER", "INTERIOR_DESIGNER"];
export const STAFF_ROLES: Role[] = ["USER_ADMIN", "PLATFORM_MANAGEMENT"];

/** ACTIVE = normal; DISABLED = suspended by a User Admin (data kept); BANNED = removed by Platform Management. */
export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED", "BANNED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = { ACTIVE: "Active", DISABLED: "Disabled", BANNED: "Banned" };

export const PROJECT_STATUSES = ["CURRENT", "PAST"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = { CURRENT: "Current", PAST: "Past" };

export const SLOT_STATUSES = ["AVAILABLE", "BOOKED"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const ISSUE_STATUSES = ["PENDING", "REVIEWED", "RECTIFIED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = { PENDING: "Pending", REVIEWED: "Reviewed", RECTIFIED: "Rectified" };

export const ISSUE_TYPES = ["BUG", "CONTENT", "ACCOUNT", "SPAM", "OTHER"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  BUG: "Bug / something is broken",
  CONTENT: "Inappropriate content",
  ACCOUNT: "Account or login problem",
  SPAM: "Spam or suspicious user",
  OTHER: "Other",
};

export const PERIODS = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_INFO: Record<Period, { label: string; current: string; periods: number }> = {
  DAILY: { label: "Daily", current: "Today", periods: 7 },
  WEEKLY: { label: "Weekly", current: "This week", periods: 8 },
  MONTHLY: { label: "Monthly", current: "This month", periods: 12 },
};

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  statusReason: string | null;
  phone: string | null;
  bio: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/** The logged-in user as seen by pages and route guards. */
export type SessionUser = Pick<User, "id" | "username" | "fullName" | "role" | "email">;

export interface UserProfile {
  id: number;
  role: Role;
  name: string;
  description: string | null;
  active: boolean;
  updatedAt: Date;
}

export interface Company {
  id: number;
  designerId: number;
  name: string;
  registrationNumber: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  yearsInBusiness: number | null;
  specialties: string | null;
  updatedAt: Date;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
}

/** An Interior Design Project (IDP) with its designer and category names. */
export interface Project {
  id: number;
  designerId: number;
  designerName: string;
  designerStatus: AccountStatus;
  categoryId: number | null;
  categoryName: string | null;
  categoryActive: boolean | null;
  title: string;
  description: string | null;
  style: string | null;
  location: string | null;
  budget: number | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  viewCount: number;
  shortlistCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface Rating {
  id: number;
  customerId: number;
  customerName: string;
  projectId: number;
  projectTitle: string;
  score: number;
  comment: string | null;
  visible: boolean;
  createdAt: Date;
}

export interface Slot {
  id: number;
  designerId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: SlotStatus;
  note: string | null;
}

export interface Issue {
  id: number;
  reporterId: number;
  reporterName: string;
  reporterRole: Role;
  type: IssueType;
  subject: string;
  description: string;
  status: IssueStatus;
  resolutionNote: string | null;
  handledById: number | null;
  handledByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}
