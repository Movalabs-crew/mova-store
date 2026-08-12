import { FaCheckCircle, FaTag, FaUndoAlt, FaCreditCard } from "react-icons/fa";

const features = [
  {
    icon: FaCheckCircle,
    title: "Hand-picked quality",
    text: "Every style is chosen from vetted makers and photographed exactly as it looks, so what you see is what lands at your door.",
  },
  {
    icon: FaTag,
    title: "Honest pricing",
    text: "No phantom markdowns, no surprise fees. The price you see is the price you pay — always.",
  },
  {
    icon: FaUndoAlt,
    title: "Blockchain transparency",
    text: "Every Stellar payment is recorded on-chain. You can verify your transaction on the public ledger anytime.",
  },
  {
    icon: FaCreditCard,
    title: "Pay your way",
    text: "Cards or USDC on Stellar — your choice. Crypto payments settle instantly with near-zero fees, no middlemen.",
  },
];

const Catalogue2 = () => {
  return (
    <section className="bg-white py-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm uppercase tracking-widest text-purple-700 font-semibold mb-2">
            Why Mova
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            Great shoes, next-gen payments
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 hover:shadow-md transition-shadow"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-700 text-white mb-4">
                <feature.icon size={22} />
              </span>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Catalogue2;
