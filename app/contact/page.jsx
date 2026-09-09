import ContactUs from "../(landingpage)/ContactUs";

export const metadata = {
  title: "24/7 Customer Service & Contact | Mova Store",
  description: "Get in touch with the Mova Store support team. Reach out via email, Discord, Twitter, or GitHub.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-mova-deep via-purple-700 to-purple-500 pt-16">
      <ContactUs />
    </div>
  );
}
