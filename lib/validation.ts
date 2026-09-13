/**
 * Input Validation Utilities
 *
 * Provides validation functions for user inputs to prevent XSS,
 * SQL injection, and other common security vulnerabilities.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Removes potentially dangerous characters from input.
 * Allows alphanumeric, spaces, and common punctuation.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Sanitizes input for safe use in HTML contexts.
 */
export function sanitizeForHtml(input: string): string {
  return escapeHtml(sanitizeText(input));
}

// =============================================================================
// EMAIL VALIDATION
// =============================================================================

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): ValidationResult {
  const sanitized = sanitizeText(email).toLowerCase();

  if (!sanitized) {
    return { isValid: false, error: "Email is required" };
  }

  if (sanitized.length > 254) {
    return { isValid: false, error: "Email is too long" };
  }

  if (!EMAIL_REGEX.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// NAME VALIDATION
// =============================================================================

/**
 * Validates a person's name.
 */
export function validateName(name: string, fieldName = "Name"): ValidationResult {
  const sanitized = sanitizeText(name);

  if (!sanitized) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (sanitized.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: `${fieldName} is too long` };
  }

  // Allow letters, spaces, hyphens, apostrophes (for names like O'Brien, Mary-Jane)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
    };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// ADDRESS VALIDATION
// =============================================================================

/**
 * Validates a street address.
 */
export function validateAddress(address: string): ValidationResult {
  const sanitized = sanitizeText(address);

  if (!sanitized) {
    return { isValid: false, error: "Address is required" };
  }

  if (sanitized.length < 5) {
    return { isValid: false, error: "Please enter a complete address" };
  }

  if (sanitized.length > 200) {
    return { isValid: false, error: "Address is too long" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a city name.
 */
export function validateCity(city: string): ValidationResult {
  const sanitized = sanitizeText(city);

  if (!sanitized) {
    return { isValid: false, error: "City is required" };
  }

  if (sanitized.length < 2) {
    return { isValid: false, error: "Please enter a valid city" };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: "City name is too long" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a postal/zip code.
 */
export function validatePostalCode(code: string): ValidationResult {
  const sanitized = sanitizeText(code).toUpperCase();

  if (!sanitized) {
    return { isValid: false, error: "Postal code is required" };
  }

  // Allow various formats (US, UK, Canada, etc.)
  const postalRegex = /^[A-Z0-9\s-]{3,10}$/;
  if (!postalRegex.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid postal code" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// PHONE VALIDATION
// =============================================================================

/**
 * Validates a phone number.
 */
export function validatePhone(phone: string): ValidationResult {
  // Remove common formatting characters
  const sanitized = sanitizeText(phone).replace(/[\s\-().]/g, "");

  if (!sanitized) {
    return { isValid: false, error: "Phone number is required" };
  }

  // Allow + for international prefix
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (!phoneRegex.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid phone number" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// PRODUCT VALIDATION
// =============================================================================

/**
 * Validates a product name.
 */
export function validateProductName(name: string): ValidationResult {
  const sanitized = sanitizeText(name);

  if (!sanitized) {
    return { isValid: false, error: "Product name is required" };
  }

  if (sanitized.length < 2) {
    return { isValid: false, error: "Product name must be at least 2 characters" };
  }

  if (sanitized.length > 200) {
    return { isValid: false, error: "Product name is too long" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates a product price.
 */
export function validatePrice(price: string | number): ValidationResult {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { isValid: false, error: "Please enter a valid price" };
  }

  if (numPrice < 0) {
    return { isValid: false, error: "Price cannot be negative" };
  }

  if (numPrice > 1000000) {
    return { isValid: false, error: "Price is too high" };
  }

  // Round to 2 decimal places
  const sanitized = numPrice.toFixed(2);
  return { isValid: true, sanitized };
}

// =============================================================================
// OTP VALIDATION
// =============================================================================

/**
 * Validates a 6-digit OTP code.
 */
export function validateOTP(otp: string): ValidationResult {
  const sanitized = sanitizeText(otp).replace(/\D/g, "");

  if (!sanitized) {
    return { isValid: false, error: "OTP code is required" };
  }

  if (sanitized.length !== 6) {
    return { isValid: false, error: "OTP must be 6 digits" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// STELLAR ADDRESS VALIDATION
// =============================================================================

/**
 * Validates a Stellar public key (G address).
 */
export function validateStellarAddress(address: string): ValidationResult {
  const sanitized = sanitizeText(address).toUpperCase();

  if (!sanitized) {
    return { isValid: false, error: "Stellar address is required" };
  }

  // Stellar public keys start with G and are 56 characters (base32 encoded)
  const stellarRegex = /^G[A-Z2-7]{55}$/;
  if (!stellarRegex.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid Stellar address" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// CREDIT CARD VALIDATION
// =============================================================================

/**
 * Validates a credit card number using the Luhn algorithm.
 */
export function validateCardNumber(cardNumber: string, strictLength = true): ValidationResult {
  const sanitized = sanitizeText(cardNumber).replace(/\s+/g, "");

  if (!sanitized) {
    return { isValid: false, error: "Card number is required" };
  }

  const lengthRegex = strictLength ? /^\d{13,19}$/ : /^\d{8,19}$/;
  if (!lengthRegex.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid card number" };
  }

  // Luhn algorithm check
  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  if (sum % 10 !== 0) {
    return { isValid: false, error: "Please enter a valid card number" };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates credit card expiry date in MM/YY or MM/YYYY format.
 */
export function validateCardExpiry(expiry: string): ValidationResult {
  const sanitized = sanitizeText(expiry).trim();

  if (!sanitized) {
    return { isValid: false, error: "Expiry date is required" };
  }

  const match = sanitized.match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/);
  if (!match) {
    return { isValid: false, error: "Please enter a valid expiry date (MM/YY)" };
  }

  const month = parseInt(match[1], 10);
  let year = parseInt(match[2], 10);
  if (match[2].length === 2) {
    year += 2000;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { isValid: false, error: "Card has expired" };
  }

  // Cap maximum future expiry (e.g. 20 years)
  if (year > currentYear + 20) {
    return { isValid: false, error: "Please enter a valid expiry date" };
  }

  const formattedMonth = month.toString().padStart(2, "0");
  const formattedYear = (year % 100).toString().padStart(2, "0");
  return { isValid: true, sanitized: `${formattedMonth}/${formattedYear}` };
}

/**
 * Validates card CVV/CVC code (3 or 4 digits).
 */
export function validateCardCVV(cvv: string): ValidationResult {
  const sanitized = sanitizeText(cvv).trim();

  if (!sanitized) {
    return { isValid: false, error: "CVV is required" };
  }

  if (!/^\d{3,4}$/.test(sanitized)) {
    return { isValid: false, error: "CVV must be 3 or 4 digits" };
  }

  return { isValid: true, sanitized };
}

// =============================================================================
// FORM VALIDATION HELPER
// =============================================================================

/**
 * Validates multiple fields at once and returns an errors object.
 * Useful for form validation.
 */
export function validateForm(
  fields: Record<string, { value: string; validator: (v: string) => ValidationResult }>
): { isValid: boolean; errors: FormErrors; sanitized: Record<string, string> } {
  const errors: FormErrors = {};
  const sanitized: Record<string, string> = {};
  let isValid = true;

  for (const [fieldName, { value, validator }] of Object.entries(fields)) {
    const result = validator(value);
    if (!result.isValid) {
      errors[fieldName] = result.error;
      isValid = false;
    } else {
      sanitized[fieldName] = result.sanitized || value;
    }
  }

  return { isValid, errors, sanitized };
}
