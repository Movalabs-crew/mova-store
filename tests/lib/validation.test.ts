import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateForm,
  validateName,
  validateOTP,
  validatePrice,
} from "../../lib/validation";

describe("input validation utilities", () => {
  it("normalizes valid email addresses and rejects invalid ones", () => {
    expect(validateEmail("  USER@example.com ")).toEqual({
      isValid: true,
      sanitized: "user@example.com",
    });
    expect(validateEmail("not-an-email").isValid).toBe(false);
  });

  it("validates names and prices", () => {
    expect(validateName("Mary-Jane")).toEqual({ isValid: true, sanitized: "Mary-Jane" });
    expect(validateName("A").isValid).toBe(false);
    expect(validatePrice("19.9")).toEqual({ isValid: true, sanitized: "19.90" });
    expect(validatePrice(-1).isValid).toBe(false);
  });

  it("requires exactly six digits for OTP codes", () => {
    expect(validateOTP("123456")).toEqual({ isValid: true, sanitized: "123456" });
    expect(validateOTP("12345").isValid).toBe(false);
    expect(validateOTP("123456abc").isValid).toBe(false);
  });

  it("returns field errors and sanitized values for form validation", () => {
    const result = validateForm({
      email: { value: "USER@example.com", validator: validateEmail },
      name: { value: "", validator: validateName },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("Name is required");
    expect(result.sanitized.email).toBe("user@example.com");
  });
});
