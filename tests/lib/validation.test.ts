import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateName,
  validatePhone,
  validateOTP,
  validatePrice,
  validateStellarAddress,
  sanitizeText,
  escapeHtml,
  sanitizeForHtml,
  validateAddress,
  validateCity,
  validatePostalCode,
  validateProductName,
  validateForm,
} from "../../lib/validation";

describe("sanitizeText", () => {
  it("removes null bytes and control characters", () => {
    expect(sanitizeText("hello\x00world")).toBe("helloworld");
    expect(sanitizeText("test\x01\x02\x03")).toBe("test");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("handles empty strings", () => {
    expect(sanitizeText("")).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("test@example.com").isValid).toBe(true);
    expect(validateEmail("user.name@domain.org").isValid).toBe(true);
    expect(validateEmail("user+tag@example.co.uk").isValid).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("").isValid).toBe(false);
    expect(validateEmail("not-an-email").isValid).toBe(false);
    expect(validateEmail("missing@domain").isValid).toBe(false);
    expect(validateEmail("@nodomain.com").isValid).toBe(false);
  });

  it("rejects emails that are too long", () => {
    const longEmail = "a".repeat(250) + "@test.com";
    expect(validateEmail(longEmail).isValid).toBe(false);
  });

  it("returns sanitized lowercase email", () => {
    const result = validateEmail("TEST@EXAMPLE.COM");
    expect(result.sanitized).toBe("test@example.com");
  });
});

describe("validateName", () => {
  it("accepts valid names", () => {
    expect(validateName("John").isValid).toBe(true);
    expect(validateName("Mary Jane").isValid).toBe(true);
    expect(validateName("O'Brien").isValid).toBe(true);
    expect(validateName("Mary-Jane").isValid).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(validateName("").isValid).toBe(false);
    expect(validateName("A").isValid).toBe(false); // too short
    expect(validateName("John123").isValid).toBe(false); // contains numbers
    expect(validateName("John@Doe").isValid).toBe(false); // contains @
  });

  it("uses custom field name in error", () => {
    const result = validateName("", "First Name");
    expect(result.error).toContain("First Name");
  });
});

describe("validatePhone", () => {
  it("accepts valid phone numbers", () => {
    expect(validatePhone("1234567890").isValid).toBe(true);
    expect(validatePhone("+1-234-567-8901").isValid).toBe(true);
    expect(validatePhone("(123) 456-7890").isValid).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(validatePhone("").isValid).toBe(false);
    expect(validatePhone("123").isValid).toBe(false); // too short
    expect(validatePhone("abc-def-ghij").isValid).toBe(false); // letters
  });

  it("sanitizes phone formatting", () => {
    const result = validatePhone("+1 (234) 567-8901");
    expect(result.sanitized).toBe("+12345678901");
  });
});

describe("validateOTP", () => {
  it("accepts valid 6-digit OTP", () => {
    expect(validateOTP("123456").isValid).toBe(true);
    expect(validateOTP("000000").isValid).toBe(true);
  });

  it("rejects invalid OTP", () => {
    expect(validateOTP("").isValid).toBe(false);
    expect(validateOTP("12345").isValid).toBe(false); // too short
    expect(validateOTP("1234567").isValid).toBe(false); // too long
    expect(validateOTP("12345a").isValid).toBe(false); // contains letter
  });

  it("strips non-digits", () => {
    const result = validateOTP("12-34-56");
    expect(result.sanitized).toBe("123456");
    expect(result.isValid).toBe(true);
  });
});

describe("validatePrice", () => {
  it("accepts valid prices", () => {
    expect(validatePrice("99.99").isValid).toBe(true);
    expect(validatePrice(100).isValid).toBe(true);
    expect(validatePrice("0").isValid).toBe(true);
  });

  it("rejects invalid prices", () => {
    expect(validatePrice("not-a-number").isValid).toBe(false);
    expect(validatePrice(-10).isValid).toBe(false);
    expect(validatePrice(1000001).isValid).toBe(false); // too high
  });

  it("formats to 2 decimal places", () => {
    const result = validatePrice("99.999");
    expect(result.sanitized).toBe("100.00");
  });
});

describe("validateStellarAddress", () => {
  it("accepts valid Stellar addresses", () => {
    const validAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(validateStellarAddress(validAddress).isValid).toBe(true);
  });

  it("rejects invalid Stellar addresses", () => {
    expect(validateStellarAddress("").isValid).toBe(false);
    expect(validateStellarAddress("not-an-address").isValid).toBe(false);
    expect(validateStellarAddress("GABC").isValid).toBe(false); // too short
    expect(validateStellarAddress("CABC...").isValid).toBe(false); // wrong prefix
  });
});

describe("validateForm", () => {
  it("validates multiple fields at once", () => {
    const result = validateForm({
      email: { value: "test@example.com", validator: validateEmail },
      name: { value: "John Doe", validator: validateName },
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("collects all errors", () => {
    const result = validateForm({
      email: { value: "invalid", validator: validateEmail },
      name: { value: "", validator: validateName },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.name).toBeDefined();
  });

  it("returns sanitized values", () => {
    const result = validateForm({
      email: { value: "TEST@EXAMPLE.COM", validator: validateEmail },
    });

    expect(result.sanitized.email).toBe("test@example.com");
  });
});

describe("sanitizeForHtml", () => {
  it("sanitizes control characters and escapes HTML tags", () => {
    expect(sanitizeForHtml("<script>alert('xss')</script>\x00")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("trims whitespace and handles empty strings", () => {
    expect(sanitizeForHtml("  <b>Bold</b>  ")).toBe("&lt;b&gt;Bold&lt;&#x2F;b&gt;");
    expect(sanitizeForHtml("")).toBe("");
  });
});

describe("validateAddress", () => {
  it("accepts valid complete addresses", () => {
    const res = validateAddress("123 Main Street, Suite 400");
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe("123 Main Street, Suite 400");
  });

  it("rejects empty address", () => {
    const res = validateAddress("   ");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Address is required");
  });

  it("rejects address shorter than 5 chars", () => {
    const res = validateAddress("123");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Please enter a complete address");
  });

  it("rejects address exceeding 200 chars", () => {
    const res = validateAddress("A".repeat(201));
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Address is too long");
  });
});

describe("validateCity", () => {
  it("accepts valid city names", () => {
    const res = validateCity("San Francisco");
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe("San Francisco");
  });

  it("rejects empty city", () => {
    const res = validateCity("");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("City is required");
  });

  it("rejects city shorter than 2 chars", () => {
    const res = validateCity("A");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Please enter a valid city");
  });

  it("rejects city exceeding 100 chars", () => {
    const res = validateCity("C".repeat(101));
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("City name is too long");
  });
});

describe("validatePostalCode", () => {
  it("accepts valid US, UK, and international postal codes", () => {
    expect(validatePostalCode("90210").isValid).toBe(true);
    expect(validatePostalCode("SW1A 1AA").isValid).toBe(true);
    expect(validatePostalCode("k1a-0b1").sanitized).toBe("K1A-0B1");
  });

  it("rejects empty postal code", () => {
    const res = validatePostalCode("");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Postal code is required");
  });

  it("rejects invalid formats or characters outside 3-10 range", () => {
    expect(validatePostalCode("12").isValid).toBe(false);
    expect(validatePostalCode("12345678901").isValid).toBe(false);
    expect(validatePostalCode("12@45").isValid).toBe(false);
  });
});

describe("validateProductName", () => {
  it("accepts valid product names", () => {
    const res = validateProductName("Classic T-Shirt");
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe("Classic T-Shirt");
  });

  it("rejects empty product name", () => {
    const res = validateProductName("   ");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Product name is required");
  });

  it("rejects product name shorter than 2 chars", () => {
    const res = validateProductName("X");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Product name must be at least 2 characters");
  });

  it("rejects product name longer than 200 chars", () => {
    const res = validateProductName("P".repeat(201));
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Product name is too long");
  });
});
