import Link from "next/link";

export const metadata = {
  title: "Terms of Use | Mova Store",
  description: "Terms and conditions for using the Mova Store platform and Stellar checkout services.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-mova-ink text-white py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-purple-400 hover:underline text-sm inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          Terms of Use
        </h1>
        <p className="text-white/80 leading-relaxed">
          Welcome to Mova Store. By accessing or using our decentralized storefront, smart contracts,
          or payment integrations on the Stellar network, you agree to comply with and be bound by these Terms of Use.
        </p>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-300">1. Decentralized Transactions</h2>
          <p className="text-white/70 leading-relaxed text-sm">
            All crypto and stablecoin transactions initiated through Mova Store are executed directly on the
            Stellar blockchain and Soroban smart contracts. Once confirmed on the ledger, blockchain transactions are irreversible.
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-300">2. Customer Responsibilities</h2>
          <p className="text-white/70 leading-relaxed text-sm">
            You are responsible for safeguarding your wallet credentials and ensuring accurate order and shipping details
            during the checkout process.
          </p>
        </section>
      </div>
    </main>
  );
}
