export const metadata = {
  title: "About us · Mova Store",
  description: "Learn about Mova Store and our Stellar-powered checkout.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-mova-surface text-slate-900">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">
          About us
        </h1>
        <p className="mt-2 text-sm text-slate-500">Mova Store</p>
        <div className="mt-10 space-y-6 text-sm leading-6 text-slate-700">
          <p>
            Mova Store is a curated footwear storefront with crypto checkout on
            the Stellar network. We combine a familiar shopping experience with
            transparent, on-chain settlement in USDC via Soroban.
          </p>
          <p>
            Our goal is simple: great products, clear pricing, and payments you
            can verify yourself on the ledger — without handing over seed phrases
            or private keys.
          </p>
          <p>
            Questions? Visit our{" "}
            <a href="/contact" className="text-purple-700 underline">
              24/7 Customer Service
            </a>{" "}
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
