import emailjs from "@emailjs/browser";

// Validate required environment variables
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const DEFAULT_RECIPIENT_EMAIL = process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL;

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
 * Sends an email using EmailJS service.
 * @param {Object} options - Email options
 * @param {string} options.name - Sender's name
 * @param {string} options.email - Sender's email address
 * @param {string} options.message - Email message body
 * @param {string} [options.recipientEmail] - Recipient email (defaults to env var)
 * @param {string} options.subject - Email subject line
 * @returns {Promise<{status: number, text: string}>} EmailJS response
 * @throws {Error} If configuration is missing or email fails to send
 */
const sendMail = async ({ name = "", email = "", message = "", recipientEmail, subject }) => {
  // Validate configuration before sending
  validateEmailConfig();

  const templateParams = {
    name: name,
    email: email,
    message: message,
    recipient_email: recipientEmail || DEFAULT_RECIPIENT_EMAIL,
    subject: subject,
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
