export const metadata = {
  title: "Customer Service · Mova Store",
  description: "24/7 customer service for Mova Store orders and support.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-mova-surface text-slate-900">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">
          24/7 Customer Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We are here to help with orders, returns, and wallet checkout questions.
        </p>
        <div className="mt-10 space-y-6 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-purple-900">WhatsApp</h2>
            <p className="mt-2">
              Message us anytime on{" "}
              <a
                href="https://wa.me/2349065165097"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 underline"
              >
                WhatsApp
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-purple-900">Orders</h2>
            <p className="mt-2">
              Include your order reference and Stellar transaction hash when
              asking about a payment or shipment so we can look it up quickly.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-purple-900">Returns</h2>
            <p className="mt-2">
              Contact us within 14 days of delivery with your order reference to
              start a return request.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
