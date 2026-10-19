import { describe, it, expect } from "vitest";
import {
  validateCardCVV,
  validateCardExpiry,
  validateCardNumber,
  validateOTP,
  validatePrice,
  validateStellarAddress,
  validateEmail,
  validateName,
  validateAddress,
  validateCity,
  validatePostalCode,
  validatePhone,
  validateProductName,
} from "../../lib/validation";

// Expiry is evaluated against the wall clock, so the arithmetic boundaries are
// built from the current date instead of hard-coded months that would rot.
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentMM = String(currentMonth).padStart(2, "0");
const currentYY = String(currentYear % 100).padStart(2, "0");
const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
const previousMM = String(previousMonth).padStart(2, "0");
const previousYY = String(previousYear % 100).padStart(2, "0");

// The next February 29 that is still in the future relative to this run.
let leapYear = currentYear;
while (!((leapYear % 4 === 0 && leapYear % 100 !== 0) || leapYear % 400 === 0)) {
  leapYear += 1;
}
if (leapYear === currentYear && currentMonth > 2) {
  leapYear += 4;
}
const leapYY = String(leapYear % 100).padStart(2, "0");

describe("validatePrice boundaries", () => {
  type PriceCase = {
    name: string;
    input: string | number;
    valid: boolean;
    error?: string;
    sanitized?: string;
  };

  const cases: PriceCase[] = [
    { name: "accepts the minimum of zero", input: 0, valid: true, sanitized: "0.00" },
    { name: "accepts the minimum of zero as a string", input: "0", valid: true, sanitized: "0.00" },
    {
      name: "rejects a value one cent below zero",
      input: -0.01,
      valid: false,
      error: "Price cannot be negative",
    },
    {
      name: "rejects a negative number",
      input: -1,
      valid: false,
      error: "Price cannot be negative",
    },
    {
      name: "accepts the maximum of one million",
      input: 1000000,
      valid: true,
      sanitized: "1000000.00",
    },
    {
      name: "accepts the maximum of one million as a string",
      input: "1000000",
      valid: true,
      sanitized: "1000000.00",
    },
    {
      name: "rejects one cent above the maximum",
      input: 1000000.01,
      valid: false,
      error: "Price is too high",
    },
    {
      name: "rejects one whole unit above the maximum",
      input: 1000001,
      valid: false,
      error: "Price is too high",
    },
    {
      name: "rejects a non-numeric string",
      input: "not-a-number",
      valid: false,
      error: "Please enter a valid price",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Please enter a valid price",
    },
    {
      name: "rejects NaN",
      input: Number.NaN,
      valid: false,
      error: "Please enter a valid price",
    },
    {
      name: "rounds a third decimal up at the upper edge",
      input: "99.999",
      valid: true,
      sanitized: "100.00",
    },
    {
      name: "pads an exact single decimal to two places",
      input: "12.5",
      valid: true,
      sanitized: "12.50",
    },
    {
      name: "accepts a leading numeric prefix and ignores trailing text",
      input: "12abc",
      valid: true,
      sanitized: "12.00",
    },
  ];

  it.each(cases)("validatePrice: $name", ({ input, valid, error, sanitized }) => {
    const result = validatePrice(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateOTP boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    {
      name: "accepts the minimum six-digit value",
      input: "000000",
      valid: true,
      sanitized: "000000",
    },
    {
      name: "accepts the smallest non-zero code",
      input: "000001",
      valid: true,
      sanitized: "000001",
    },
    {
      name: "accepts the maximum six-digit value",
      input: "999999",
      valid: true,
      sanitized: "999999",
    },
    {
      name: "rejects five digits, one below the length boundary",
      input: "12345",
      valid: false,
      error: "OTP must be 6 digits",
    },
    {
      name: "rejects seven digits, one above the length boundary",
      input: "1234567",
      valid: false,
      error: "OTP must be 6 digits",
    },
    {
      name: "rejects a single digit",
      input: "1",
      valid: false,
      error: "OTP must be 6 digits",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "OTP code is required",
    },
    {
      name: "rejects a string with no digits left after stripping",
      input: "abcdef",
      valid: false,
      error: "OTP code is required",
    },
    {
      name: "strips separators and accepts six remaining digits",
      input: "12-34-56",
      valid: true,
      sanitized: "123456",
    },
    {
      name: "strips surrounding whitespace around six digits",
      input: " 123456 ",
      valid: true,
      sanitized: "123456",
    },
    {
      name: "strips a trailing letter and still finds six digits",
      input: "123456a",
      valid: true,
      sanitized: "123456",
    },
    {
      name: "rejects five digits after a trailing letter is stripped",
      input: "12345a",
      valid: false,
      error: "OTP must be 6 digits",
    },
  ];

  it.each(cases)("validateOTP: $name", ({ input, valid, error, sanitized }) => {
    const result = validateOTP(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateStellarAddress boundaries", () => {
  const canonical = "G" + "A".repeat(55);
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    {
      name: "accepts a 56-character G address",
      input: canonical,
      valid: true,
      sanitized: canonical,
    },
    {
      name: "uppercases a lowercase address before matching",
      input: "g" + "a".repeat(55),
      valid: true,
      sanitized: canonical,
    },
    {
      name: "accepts the base32 digit 2 in the body",
      input: "G" + "2".repeat(55),
      valid: true,
    },
    {
      name: "accepts the base32 digit 7 in the body",
      input: "G" + "7".repeat(55),
      valid: true,
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Stellar address is required",
    },
    {
      name: "rejects a body one character short",
      input: "G" + "A".repeat(54),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects a body one character long",
      input: "G" + "A".repeat(56),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the wrong version byte A",
      input: "A" + "A".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the contract prefix C",
      input: "C" + "A".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the base32-excluded character 0",
      input: "G" + "0".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the base32-excluded character 1",
      input: "G" + "1".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the base32-excluded character 8",
      input: "G" + "8".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects the base32-excluded character 9",
      input: "G" + "9".repeat(55),
      valid: false,
      error: "Please enter a valid Stellar address",
    },
    {
      name: "rejects a hyphenated non-address",
      input: "not-an-address",
      valid: false,
      error: "Please enter a valid Stellar address",
    },
  ];

  it.each(cases)("validateStellarAddress: $name", ({ input, valid, error, sanitized }) => {
    const result = validateStellarAddress(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });

  it("accepts a regex-shaped body without verifying the StrKey checksum", () => {
    // The implementation only checks the G prefix, length and base32 charset,
    // so two different payloads of the same shape are both accepted.
    expect(validateStellarAddress("G" + "A".repeat(54) + "B").isValid).toBe(true);
    expect(validateStellarAddress("G" + "A".repeat(54) + "C").isValid).toBe(true);
  });
});

describe("validateCardNumber boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    {
      name: "accepts the Luhn-valid 13-digit minimum",
      input: "4000000000006",
      valid: true,
      sanitized: "4000000000006",
    },
    {
      name: "accepts a Luhn-valid 16-digit number",
      input: "4111111111111111",
      valid: true,
      sanitized: "4111111111111111",
    },
    {
      name: "accepts the Luhn-valid 19-digit maximum",
      input: "4000000000000000006",
      valid: true,
      sanitized: "4000000000000000006",
    },
    {
      name: "rejects 12 digits, one below the minimum",
      input: "400000000002",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects 20 digits, one above the maximum",
      input: "40000000000000000002",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects a 13-digit number with the Luhn check digit off by one",
      input: "4000000000007",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects a 16-digit number whose last digit breaks the Luhn sum",
      input: "4111111111111112",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Card number is required",
    },
    {
      name: "rejects a purely alphabetic string",
      input: "abcdefghijklm",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects embedded non-digits",
      input: "4111a1111111111111",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "rejects hyphen separators because only spaces are stripped",
      input: "4111-1111-1111-1111",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "accepts a space-separated number and returns it compacted",
      input: "4111 1111 1111 1111",
      valid: true,
      sanitized: "4111111111111111",
    },
    {
      name: "accepts an all-zero 13-digit number because Luhn sums to zero",
      input: "0000000000000",
      valid: true,
      sanitized: "0000000000000",
    },
  ];

  it.each(cases)("validateCardNumber: $name", ({ input, valid, error, sanitized }) => {
    const result = validateCardNumber(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });

  const relaxedCases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
  }> = [
    {
      name: "accepts a Luhn-valid 8-digit number when strictLength is false",
      input: "40000002",
      valid: true,
    },
    {
      name: "rejects a Luhn-valid 7-digit number below the relaxed minimum",
      input: "4000006",
      valid: false,
      error: "Please enter a valid card number",
    },
    {
      name: "accepts the 12-digit number that strict mode rejects",
      input: "400000000002",
      valid: true,
    },
    {
      name: "rejects 20 digits even when strictLength is false",
      input: "40000000000000000002",
      valid: false,
      error: "Please enter a valid card number",
    },
  ];

  it.each(relaxedCases)(
    "validateCardNumber(strictLength=false): $name",
    ({ input, valid, error }) => {
      const result = validateCardNumber(input, false);
      expect(result.isValid).toBe(valid);
      if (error !== undefined) {
        expect(result.error).toBe(error);
      }
    }
  );
});

describe("validateCardExpiry boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    {
      name: "accepts the current month as the lower valid boundary",
      input: `${currentMM}/${currentYY}`,
      valid: true,
      sanitized: `${currentMM}/${currentYY}`,
    },
    {
      name: "accepts the current month written with a four-digit year",
      input: `${currentMM}/${currentYear}`,
      valid: true,
      sanitized: `${currentMM}/${currentYY}`,
    },
    {
      name: "accepts the current month at the maximum future year",
      input: `${currentMM}/${currentYear + 20}`,
      valid: true,
      sanitized: `${currentMM}/${String((currentYear + 20) % 100).padStart(2, "0")}`,
    },
    {
      name: "rejects one year past the maximum future year",
      input: `${currentMM}/${currentYear + 21}`,
      valid: false,
      error: "Please enter a valid expiry date",
    },
    {
      name: "rejects the previous month as expired",
      input: `${previousMM}/${previousYY}`,
      valid: false,
      error: "Card has expired",
    },
    {
      name: "rejects the previous month written with a four-digit year as expired",
      input: `${previousMM}/${previousYear}`,
      valid: false,
      error: "Card has expired",
    },
    {
      name: "rejects month 00",
      input: `00/${currentYY}`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects month 13",
      input: `13/${currentYY}`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects a single-digit month such as 2/26",
      input: `2/${currentYY}`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects a single-digit year",
      input: `${currentMM}/6`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects a three-digit year",
      input: `${currentMM}/206`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects a five-digit year",
      input: `${currentMM}/20626`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects a value with no slash",
      input: `${currentMM}${currentYY}`,
      valid: false,
      error: "Please enter a valid expiry date (MM/YY)",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Expiry date is required",
    },
    {
      name: "rejects whitespace only",
      input: "   ",
      valid: false,
      error: "Expiry date is required",
    },
    {
      name: "trims surrounding whitespace around the current month",
      input: ` ${currentMM}/${currentYY} `,
      valid: true,
      sanitized: `${currentMM}/${currentYY}`,
    },
    {
      name: "accepts February of the next leap year inside the window",
      input: `02/${leapYear}`,
      valid: true,
      sanitized: `02/${leapYY}`,
    },
  ];

  it.each(cases)("validateCardExpiry: $name", ({ input, valid, error, sanitized }) => {
    const result = validateCardExpiry(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateCardCVV boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    { name: "accepts the three-digit minimum", input: "000", valid: true, sanitized: "000" },
    { name: "accepts the four-digit maximum", input: "9999", valid: true, sanitized: "9999" },
    { name: "accepts three digits at the lower edge", input: "123", valid: true, sanitized: "123" },
    {
      name: "rejects two digits, one below the minimum",
      input: "12",
      valid: false,
      error: "CVV must be 3 or 4 digits",
    },
    {
      name: "rejects five digits, one above the maximum",
      input: "12345",
      valid: false,
      error: "CVV must be 3 or 4 digits",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "CVV is required",
    },
    {
      name: "rejects alphabetic input",
      input: "abc",
      valid: false,
      error: "CVV must be 3 or 4 digits",
    },
    {
      name: "rejects an embedded space",
      input: "12 3",
      valid: false,
      error: "CVV must be 3 or 4 digits",
    },
    {
      name: "rejects a negative value",
      input: "-123",
      valid: false,
      error: "CVV must be 3 or 4 digits",
    },
    {
      name: "trims surrounding whitespace",
      input: " 123 ",
      valid: true,
      sanitized: "123",
    },
  ];

  it.each(cases)("validateCardCVV: $name", ({ input, valid, error, sanitized }) => {
    const result = validateCardCVV(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateEmail boundaries", () => {
  const maxEmail = "a".repeat(254 - "@example.com".length) + "@example.com";
  const tooLongEmail = "a".repeat(255 - "@example.com".length) + "@example.com";

  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    { name: "accepts a 254-character address", input: maxEmail, valid: true },
    {
      name: "rejects a 255-character address",
      input: tooLongEmail,
      valid: false,
      error: "Email is too long",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Email is required",
    },
    {
      name: "rejects an address without a TLD",
      input: "missing@domain",
      valid: false,
      error: "Please enter a valid email address",
    },
    {
      name: "rejects a one-character TLD",
      input: "user@domain.c",
      valid: false,
      error: "Please enter a valid email address",
    },
    {
      name: "lowercases the returned sanitized address",
      input: "TEST@EXAMPLE.COM",
      valid: true,
      sanitized: "test@example.com",
    },
  ];

  it.each(cases)("validateEmail: $name", ({ input, valid, error, sanitized }) => {
    const result = validateEmail(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateName boundaries", () => {
  const cases: Array<{ name: string; input: string; valid: boolean; error?: string }> = [
    { name: "accepts the two-character minimum", input: "Jo", valid: true },
    {
      name: "rejects one character",
      input: "J",
      valid: false,
      error: "Name must be at least 2 characters",
    },
    { name: "accepts a 100-character name", input: "N".repeat(100), valid: true },
    {
      name: "rejects a 101-character name",
      input: "N".repeat(101),
      valid: false,
      error: "Name is too long",
    },
    {
      name: "rejects a digit inside the name",
      input: "Jo1",
      valid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes",
    },
    {
      name: "rejects whitespace only",
      input: "   ",
      valid: false,
      error: "Name is required",
    },
  ];

  it.each(cases)("validateName: $name", ({ input, valid, error }) => {
    const result = validateName(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
  });
});

describe("validateAddress boundaries", () => {
  const cases: Array<{ name: string; input: string; valid: boolean; error?: string }> = [
    { name: "accepts the five-character minimum", input: "12345", valid: true },
    {
      name: "rejects four characters",
      input: "1234",
      valid: false,
      error: "Please enter a complete address",
    },
    { name: "accepts a 200-character address", input: "A".repeat(200), valid: true },
    {
      name: "rejects a 201-character address",
      input: "A".repeat(201),
      valid: false,
      error: "Address is too long",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Address is required",
    },
  ];

  it.each(cases)("validateAddress: $name", ({ input, valid, error }) => {
    const result = validateAddress(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
  });
});

describe("validateCity boundaries", () => {
  const cases: Array<{ name: string; input: string; valid: boolean; error?: string }> = [
    { name: "accepts the two-character minimum", input: "LA", valid: true },
    {
      name: "rejects one character",
      input: "L",
      valid: false,
      error: "Please enter a valid city",
    },
    { name: "accepts a 100-character city name", input: "C".repeat(100), valid: true },
    {
      name: "rejects a 101-character city name",
      input: "C".repeat(101),
      valid: false,
      error: "City name is too long",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "City is required",
    },
  ];

  it.each(cases)("validateCity: $name", ({ input, valid, error }) => {
    const result = validateCity(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
  });
});

describe("validatePostalCode boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    { name: "accepts the three-character minimum", input: "123", valid: true, sanitized: "123" },
    {
      name: "rejects two characters",
      input: "12",
      valid: false,
      error: "Please enter a valid postal code",
    },
    {
      name: "accepts the ten-character maximum",
      input: "A".repeat(10),
      valid: true,
      sanitized: "A".repeat(10),
    },
    {
      name: "rejects eleven characters",
      input: "A".repeat(11),
      valid: false,
      error: "Please enter a valid postal code",
    },
    {
      name: "rejects a character outside the allowed set",
      input: "12@45",
      valid: false,
      error: "Please enter a valid postal code",
    },
    {
      name: "uppercases the returned sanitized code",
      input: "k1a-0b1",
      valid: true,
      sanitized: "K1A-0B1",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Postal code is required",
    },
  ];

  it.each(cases)("validatePostalCode: $name", ({ input, valid, error, sanitized }) => {
    const result = validatePostalCode(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validatePhone boundaries", () => {
  const cases: Array<{
    name: string;
    input: string;
    valid: boolean;
    error?: string;
    sanitized?: string;
  }> = [
    { name: "accepts the seven-digit minimum", input: "1234567", valid: true },
    {
      name: "rejects six digits",
      input: "123456",
      valid: false,
      error: "Please enter a valid phone number",
    },
    { name: "accepts the fifteen-digit maximum", input: "1".repeat(15), valid: true },
    {
      name: "rejects sixteen digits",
      input: "1".repeat(16),
      valid: false,
      error: "Please enter a valid phone number",
    },
    {
      name: "accepts a leading plus with fifteen digits",
      input: "+" + "1".repeat(15),
      valid: true,
      sanitized: "+" + "1".repeat(15),
    },
    {
      name: "strips formatting characters",
      input: "+1 (234) 567-8901",
      valid: true,
      sanitized: "+12345678901",
    },
    {
      name: "rejects an empty string",
      input: "",
      valid: false,
      error: "Phone number is required",
    },
  ];

  it.each(cases)("validatePhone: $name", ({ input, valid, error, sanitized }) => {
    const result = validatePhone(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
    if (sanitized !== undefined) {
      expect(result.sanitized).toBe(sanitized);
    }
  });
});

describe("validateProductName boundaries", () => {
  const cases: Array<{ name: string; input: string; valid: boolean; error?: string }> = [
    { name: "accepts the two-character minimum", input: "AB", valid: true },
    {
      name: "rejects one character",
      input: "A",
      valid: false,
      error: "Product name must be at least 2 characters",
    },
    { name: "accepts a 200-character name", input: "P".repeat(200), valid: true },
    {
      name: "rejects a 201-character name",
      input: "P".repeat(201),
      valid: false,
      error: "Product name is too long",
    },
    {
      name: "rejects whitespace only",
      input: "   ",
      valid: false,
      error: "Product name is required",
    },
  ];

  it.each(cases)("validateProductName: $name", ({ input, valid, error }) => {
    const result = validateProductName(input);
    expect(result.isValid).toBe(valid);
    if (error !== undefined) {
      expect(result.error).toBe(error);
    }
  });
});
