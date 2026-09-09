import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Mova Store",
  description: "Privacy policy for Mova Store explaining how we handle user data and blockchain transactions.",
};

export default function PrivacyPolicy() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-gradient-to-r from-mova-deep via-purple-700 to-purple-600 text-white py-14 px-4 text-center mt-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-lg text-purple-100">Last updated: {new Date().getFullYear()}</p>
      </header>

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>
              When you use Mova Store, we collect information necessary to fulfill your orders and improve our service.
              This may include your contact details (such as email address), shipping information, and your public
              Stellar wallet address when completing an on-chain checkout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Blockchain Transparency</h2>
            <p>
              Please note that transactions conducted on the Stellar network are publicly recorded on an immutable ledger.
              Your public wallet address, transaction amounts, and transaction hashes are visible on public block explorers
              by design.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Process and verify Stellar payments and order status.</li>
              <li>Communicate order updates and customer service inquiries.</li>
              <li>Prevent fraudulent transactions and secure the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p>
              We do not sell your personal information. We may share information with trusted third-party providers
              (such as Supabase for database storage and email delivery services) solely to operate the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions or requests regarding your personal data, please reach out via our{" "}
              <Link href="/contact" className="text-purple-600 font-semibold hover:underline">
                Contact Page
              </Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
