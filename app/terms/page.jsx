export const metadata = {
  title: "Terms of Use · Mova Store",
  description: "Terms of use for the Mova Store storefront.",
};

const sections = [
  {
    heading: "1. Acceptance of terms",
    body: "By accessing or purchasing from Mova Store (the “Store”), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use the Store.",
  },
  {
    heading: "2. Products and listings",
    body: "We work hard to display our products as accurately as possible, but we cannot guarantee that every detail, color or specification is error-free. All sales are subject to availability of the item.",
  },
  {
    heading: "3. Orders and payments",
    body: "Orders placed through the Store are confirmed only when the payment is successfully escrowed on the Stellar network (USDC via the Soroban checkout contract) and the order appears in your account. We may decline or cancel an order if we suspect fraud, misrepresentation or a technical fault.",
  },
  {
    heading: "4. Pricing and currency",
    body: "All prices are quoted in US dollars and settled in USDC. Prices may change without notice; the price displayed at the time you place your order is the price that will be charged.",
  },
  {
    heading: "5. Shipping and delivery",
    body: "Delivery times are estimates. Mova Store is not responsible for delays caused by carriers, customs or circumstances beyond our reasonable control.",
  },
  {
    heading: "6. Returns",
    body: "Returns and refunds are handled case by case in line with applicable consumer law. To request a return, contact customer service within 14 days of delivery with your order reference.",
  },
  {
    heading: "7. User conduct",
    body: "You agree not to misuse the Store, including by attempting to interfere with the checkout contract, scraping the catalog at scale, or submitting false or fraudulent orders.",
  },
  {
    heading: "8. Limitation of liability",
    body: "To the maximum extent permitted by law, Mova Store is not liable for indirect or consequential losses arising from your use of the Store. Blockchain-based settlement is final once the transaction is included in a ledger; see the checkout confirmation for the transaction hash.",
  },
  {
    heading: "9. Changes to these terms",
    body: "We may update these terms from time to time. The latest version will always be published on this page; continued use of the Store after changes constitutes acceptance of the new terms.",
  },
  {
    heading: "10. Contact",
    body: "Questions about these terms can be sent through the 24/7 customer service section on our home page.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-mova-surface text-slate-900">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: September 4, 2026
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold text-purple-900">
                {s.heading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
