import { describe, it, expect } from "vitest";
import { parseError } from "../../lib/errors";

class MockAuthError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

describe("parseError Supabase structured auth error mapping", () => {
  it("maps email_not_confirmed code even with generic error message", () => {
    const error = new MockAuthError("An unexpected error occurred", "email_not_confirmed");
    const parsed = parseError(error);
    expect(parsed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
    expect(parsed.userMessage).toBe("Please confirm your email before signing in.");
  });

  it("maps user_already_exists code to AUTH_EMAIL_EXISTS", () => {
    const error = new MockAuthError("Error", "user_already_exists");
    const parsed = parseError(error);
    expect(parsed.code).toBe("AUTH_EMAIL_EXISTS");
    expect(parsed.action).toBe("Login");
  });

  it("maps invalid_credentials code to AUTH_INVALID_CREDENTIALS", () => {
    const error = new MockAuthError("Auth failed", "invalid_credentials");
    const parsed = parseError(error);
    expect(parsed.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("maps weak_password code to AUTH_WEAK_PASSWORD", () => {
    const error = new MockAuthError("Password rejected", "weak_password");
    const parsed = parseError(error);
    expect(parsed.code).toBe("AUTH_WEAK_PASSWORD");
  });

  it("still supports direct phrase matching fallback when code is missing", () => {
    const error = new Error("User already registered");
    const parsed = parseError(error);
    expect(parsed.code).toBe("AUTH_EMAIL_EXISTS");
  });
});
