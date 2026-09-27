import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeText,
  sanitizeForHtml,
  validateEmail,
  validateName,
  validateAddress,
  validateCity,
  validatePostalCode,
  validatePhone,
  validateProductName,
  validatePrice,
  validateOTP,
  validateStellarAddress,
  validateCardNumber,
  validateCardExpiry,
  validateCardCVV,
  validateForm,
} from "../../lib/validation";

describe("sanitization helpers", () => {
  it("escapeHtml escapes special characters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;x&#x27;)&lt;&#x2F;script&gt;"
    );
    expect(escapeHtml('a & b "c"')).toBe("a &amp; b &quot;c&quot;");
  });

  it("sanitizeText strips control characters and trims", () => {
    expect(sanitizeText("  hello world  ")).toBe("hello world");
    expect(sanitizeText("hello\u0000world")).toBe("helloworld");
    expect(sanitizeText("tab	here")).toBe("tabhere");
    expect(sanitizeText("")).toBe("");
    expect(sanitizeText(null as unknown as string)).toBe("");
  });

  it("sanitizeForHtml escapes the sanitized text", () => {
    expect(sanitizeForHtml("<b>hi</b>")).toBe("&lt;b&gt;hi&lt;&#x2F;b&gt;");
  });
});

describe("validateEmail", () => {
  it("accepts a well-formed email", () => {
    const r = validateEmail("Test@Example.com");
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe("test@example.com");
  });

  it("rejects empty and malformed emails", () => {
    expect(validateEmail("").isValid).toBe(false);
    expect(validateEmail("not-an-email").isValid).toBe(false);
    expect(validateEmail("a@b").isValid).toBe(false);
  });
});

describe("validateName", () => {
  it("accepts a normal name and trims it", () => {
    expect(validateName("  Mary-Jane O'Brien  ").isValid).toBe(true);
  });

  it("rejects too-short or invalid names", () => {
    expect(validateName("A").isValid).toBe(false);
    expect(validateName("1234").isValid).toBe(false);
    expect(validateName("").isValid).toBe(false);
  });
});

describe("validateAddress / validateCity", () => {
  it("validates address length", () => {
    expect(validateAddress("123 Main St").isValid).toBe(true);
    expect(validateAddress("x").isValid).toBe(false);
    expect(validateAddress("").isValid).toBe(false);
  });

  it("validates city length", () => {
    expect(validateCity("Lagos").isValid).toBe(true);
    expect(validateCity("").isValid).toBe(false);
  });
});

describe("validatePostalCode", () => {
  it("accepts common postal formats", () => {
    expect(validatePostalCode("94105").isValid).toBe(true);
    expect(validatePostalCode("SW1A 1AA").isValid).toBe(true);
  });

  it("rejects empty postal codes", () => {
    expect(validatePostalCode("").isValid).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts digits with formatting", () => {
    expect(validatePhone("(415) 555-2671").isValid).toBe(true);
    expect(validatePhone("+14155552671").isValid).toBe(true);
  });

  it("rejects too-short or non-numeric phones", () => {
    expect(validatePhone("123").isValid).toBe(false);
    expect(validatePhone("abc").isValid).toBe(false);
  });
});

describe("validateProductName", () => {
  it("accepts a reasonable product name", () => {
    expect(validateProductName("Mova Runner").isValid).toBe(true);
  });

  it("rejects empty or too-short names", () => {
    expect(validateProductName("").isValid).toBe(false);
    expect(validateProductName("x").isValid).toBe(false);
  });
});

describe("validatePrice", () => {
  it("accepts numeric prices and rounds to 2 decimals", () => {
    const r = validatePrice("49.999");
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe("50.00");
  });

  it("rejects negative, non-numeric, and too-high prices", () => {
    expect(validatePrice("-5").isValid).toBe(false);
    expect(validatePrice("abc").isValid).toBe(false);
    expect(validatePrice("2000000").isValid).toBe(false);
  });
});

describe("validateOTP", () => {
  it("accepts a 6-digit code and strips non-digits", () => {
    const r = validateOTP(" 123-456 ");
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe("123456");
  });

  it("rejects wrong-length codes", () => {
    expect(validateOTP("12345").isValid).toBe(false);
    expect(validateOTP("").isValid).toBe(false);
  });
});

describe("validateStellarAddress", () => {
  it("accepts a correctly formatted G-address", () => {
    const valid = "G" + "A".repeat(55);
    expect(validateStellarAddress(valid).isValid).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(validateStellarAddress("invalid").isValid).toBe(false);
    expect(validateStellarAddress("").isValid).toBe(false);
  });
});

describe("validateCardNumber (Luhn)", () => {
  it("accepts a valid Luhn number with spaces", () => {
    expect(validateCardNumber("4242 4242 4242 4242").isValid).toBe(true);
  });

  it("rejects a failing Luhn number", () => {
    expect(validateCardNumber("1234567890123456").isValid).toBe(false);
  });
});

describe("validateCardExpiry", () => {
  it("rejects malformed expiry strings", () => {
    expect(validateCardExpiry("13/25").isValid).toBe(false);
    expect(validateCardExpiry("abc").isValid).toBe(false);
  });

  it("rejects an already-expired date", () => {
    expect(validateCardExpiry("01/20").isValid).toBe(false);
  });

  it("accepts a clearly future date", () => {
    expect(validateCardExpiry("12/30").isValid).toBe(true);
  });
});

describe("validateCardCVV", () => {
  it("accepts 3 and 4 digit CVVs", () => {
    expect(validateCardCVV("123").isValid).toBe(true);
    expect(validateCardCVV("1234").isValid).toBe(true);
  });

  it("rejects wrong-length CVVs", () => {
    expect(validateCardCVV("12").isValid).toBe(false);
    expect(validateCardCVV("").isValid).toBe(false);
  });
});

describe("validateForm", () => {
  it("collects errors and sanitized values across fields", () => {
    const result = validateForm({
      email: { value: "a@b.com", validator: validateEmail },
      name: { value: "Ada", validator: validateName },
      bad: { value: "", validator: validateEmail },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.bad).toBeDefined();
    expect(result.sanitized.email).toBe("a@b.com");
    expect(result.sanitized.name).toBe("Ada");
  });
});
