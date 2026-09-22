export function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
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
