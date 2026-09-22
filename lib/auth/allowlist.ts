export const DEFAULT_ALLOWED_EMAILS = "min4639@gmail.com";

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  const source = raw?.trim() ? raw : DEFAULT_ALLOWED_EMAILS;
  return new Set(
    source
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(
  email: string | null | undefined,
  verified: boolean | undefined,
  allowed: Set<string>,
): boolean {
  if (!verified) return false;
  if (!email) return false;
  return allowed.has(email.trim().toLowerCase());
}
