import { describe, expect, test } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "../lib/auth/allowlist";

describe("email allowlist", () => {
  test("accepts verified emails from the allowlist", () => {
    const allowed = parseAllowedEmails("min@example.com, other@example.com");
    expect(isAllowedEmail("min@example.com", true, allowed)).toBe(true);
    expect(isAllowedEmail("unknown@example.com", true, allowed)).toBe(false);
    expect(isAllowedEmail("min@example.com", false, allowed)).toBe(false);
  });

  test("defaults to the registered admin email", () => {
    const allowed = parseAllowedEmails(undefined);
    expect(isAllowedEmail("min4639@gmail.com", true, allowed)).toBe(true);
  });
});
