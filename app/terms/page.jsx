import Link from "next/link";

export const metadata = {
  title: "Terms of Use | Mova Store",
  description: "Terms and conditions for using Mova Store, purchasing shoes, and transacting via the Stellar network.",
};

export default function TermsOfUse() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-gradient-to-r from-mova-deep via-purple-700 to-purple-600 text-white py-14 px-4 text-center mt-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms of Use</h1>
        <p className="mt-2 text-lg text-purple-100">Last updated: {new Date().getFullYear()}</p>
      </header>

      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Mova Store (&quot;the Platform&quot;), you agree to comply with and be bound
              by these Terms of Use. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Stellar Blockchain Transactions</h2>
            <p>
              Mova Store facilitates payments using the Stellar network (including USDC and XLM). You acknowledge
              that blockchain transactions are irreversible and subject to network confirmation. Mova Store is not
              responsible for funds sent to incorrect wallet addresses or network delays outside our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Orders and Fulfillment</h2>
            <p>
              All product listings, prices, and availability are subject to change without notice. An order is
              considered confirmed once the corresponding Stellar transaction hash has been validated on-chain by
              our payment verification service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Open-Source Software</h2>
            <p>
              Mova Store is an open-source demonstration and e-commerce project licensed under the MIT License.
              The underlying software is provided &quot;as is&quot;, without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Contact & Questions</h2>
            <p>
              If you have any questions regarding these terms, please contact our support team at{" "}
              <Link href="/contact" className="text-purple-600 font-semibold hover:underline">
                24/7 Customer Service
              </Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
