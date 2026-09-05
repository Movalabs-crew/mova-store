import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Mova Store",
  description: "Privacy policy describing how Mova Store handles customer data and Stellar transactions.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-mova-ink text-white py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-purple-400 hover:underline text-sm inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-white/80 leading-relaxed">
          At Mova Store, we value your privacy and security. This Privacy Policy explains our data collection and protection practices.
        </p>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-300">1. Information Collection</h2>
          <p className="text-white/70 leading-relaxed text-sm">
            We only collect essential information required for order fulfillment and customer communications,
            such as contact email, delivery address, and public blockchain transaction identifiers.
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-300">2. Blockchain Transparency</h2>
          <p className="text-white/70 leading-relaxed text-sm">
            Please note that payment transactions conducted on the Stellar ledger are public by nature.
            We do not store private keys, seed phrases, or sensitive wallet signing material.
          </p>
        </section>
      </div>
    </main>
  );
}
