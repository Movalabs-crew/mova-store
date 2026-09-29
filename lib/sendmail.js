import emailjs from "@emailjs/browser";
import { validateEmail, validateName } from "./validation";

// Validate required environment variables
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const DEFAULT_RECIPIENT_EMAIL = process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL;

// Client-side send budget. The EmailJS public key ships in the browser bundle,
// so this cannot stop a determined attacker — it stops a single tab (or a
// copied snippet) from burning the store's quota in a burst. Real enforcement
// belongs behind a server route.
const RATE_LIMIT_MAX = Number.parseInt(process.env.NEXT_PUBLIC_EMAILJS_RATE_LIMIT_MAX ?? "3", 10);
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_EMAILJS_RATE_LIMIT_WINDOW_MS ?? "60000",
  10
);

/** Timestamps of sends inside the current window. */
let recentSends = [];

/**
 * Validates that all required EmailJS environment variables are configured.
 * @throws {Error} If any required environment variable is missing.
 */
const validateEmailConfig = () => {
  const missingVars = [];

  if (!EMAILJS_SERVICE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
  if (!EMAILJS_TEMPLATE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID");
  if (!EMAILJS_PUBLIC_KEY) missingVars.push("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required EmailJS configuration. Please set the following environment variables: ${missingVars.join(", ")}. ` +
        `See .env.local.example for reference.`
    );
  }
};

/**
 * Strips CR, LF and other control characters from a value that EmailJS places
 * in an email header. Without this, `name`, `email` or `subject` could inject
 * extra headers (e.g. a hidden `Bcc:`) into the message EmailJS builds.
 *
 * @param {unknown} value
 * @returns {string} the value with control characters collapsed to spaces
 */
export function sanitizeHeaderValue(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x1F\x7F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertWithinRateLimit(now = Date.now()) {
  const windowMs =
    Number.isFinite(RATE_LIMIT_WINDOW_MS) && RATE_LIMIT_WINDOW_MS > 0
      ? RATE_LIMIT_WINDOW_MS
      : 60000;
  const max = Number.isFinite(RATE_LIMIT_MAX) && RATE_LIMIT_MAX > 0 ? RATE_LIMIT_MAX : 3;

  recentSends = recentSends.filter((timestamp) => now - timestamp < windowMs);
  if (recentSends.length >= max) {
    throw new Error("Too many email requests. Please wait a moment and try again.");
  }
  recentSends.push(now);
}

/**
 * Sends a transactional email using the EmailJS service.
 *
 * The recipient is pinned to the validated sender address: callers cannot
 * choose an arbitrary recipient, so the store's EmailJS account cannot be used
 * as an open relay. Values bound for email headers are stripped of CR/LF and
 * validated before sending.
 *
 * @param {Object} options - Email options
 * @param {string} options.name - Sender's name
 * @param {string} options.email - Sender's email address (also the recipient)
 * @param {string} options.message - Email message body
 * @param {string} [options.subject] - Email subject line
 * @returns {Promise<{status: number, text: string}>} EmailJS response
 * @throws {Error} If configuration is missing, a field is invalid, the send
 *   budget is exhausted, or EmailJS fails.
 */
const sendMail = async ({ name = "", email = "", message = "", subject = "" }) => {
  // Validate configuration before sending
  validateEmailConfig();

  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    throw new Error(emailResult.error || "A valid email address is required");
  }
  const senderEmail = emailResult.sanitized;

  let senderName = "";
  const rawName = sanitizeHeaderValue(name);
  if (rawName) {
    const nameResult = validateName(rawName, "Name");
    if (!nameResult.isValid) {
      throw new Error(nameResult.error);
    }
    senderName = nameResult.sanitized ?? rawName;
  }

  const safeSubject = sanitizeHeaderValue(subject);
  const safeMessage = typeof message === "string" ? message.replace(/\0/g, "") : "";

  // Transactional mail may only be addressed to the validated sender. The
  // configured default is a defensive fallback, never a caller choice.
  const recipientEmail = senderEmail || DEFAULT_RECIPIENT_EMAIL;

  assertWithinRateLimit();

  const templateParams = {
    name: senderName,
    email: senderEmail,
    message: safeMessage,
    recipient_email: recipientEmail,
    subject: safeSubject,
  };

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    return { status: response.status, text: response.text };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default sendMail;
