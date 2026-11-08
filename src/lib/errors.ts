/** A business rule was broken (duplicate username, invalid rating, ...). The message is safe to show users. */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function isBlank(value: unknown): boolean {
  return clean(value) === null;
}

/** Escapes % _ and \ so user input is matched literally inside a LIKE pattern (used with ESCAPE '\'). */
export function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
