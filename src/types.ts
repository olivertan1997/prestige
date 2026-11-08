// Shared domain types and value lists for Prestige Interior Design.

export const ROLES = ["USER_ADMIN", "INTERIOR_DESIGNER", "CUSTOMER", "PLATFORM_MANAGEMENT"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  USER_ADMIN: "User Admin",
  INTERIOR_DESIGNER: "Interior Designer",
  CUSTOMER: "Customer",
  PLATFORM_MANAGEMENT: "Platform Management",
};

/** ACTIVE = normal; DISABLED = suspended by a User Admin (data kept); BANNED = removed by Platform Management. */
export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED", "BANNED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = { ACTIVE: "Active", DISABLED: "Disabled", BANNED: "Banned" };

export const PROJECT_STATUSES = ["CURRENT", "PAST"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = { CURRENT: "Current", PAST: "Past" };

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
