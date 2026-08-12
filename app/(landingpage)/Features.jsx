import { FaBolt, FaShieldAlt, FaGlobe, FaWallet, FaReceipt, FaHeadset } from "react-icons/fa";

const features = [
  {
    icon: FaBolt,
    title: "Instant Settlement",
    description: "Payments confirm in 3-5 seconds on Stellar. No waiting days for bank transfers.",
  },
  {
    icon: FaShieldAlt,
    title: "Secure & Trustless",
    description: "Smart contracts handle escrow. Your funds are protected until delivery confirmation.",
  },
  {
    icon: FaGlobe,
    title: "Global Access",
    description: "Pay from anywhere in the world with USDC. No currency conversion fees.",
  },
  {
    icon: FaWallet,
    title: "Your Keys, Your Coins",
    description: "Connect your Freighter wallet. We never hold your crypto — you stay in control.",
  },
  {
    icon: FaReceipt,
    title: "On-Chain Receipts",
    description: "Every transaction is recorded on the Stellar ledger. Verify anytime, anywhere.",
  },
  {
    icon: FaHeadset,
    title: "Human Support",
    description: "Real people answer your questions. Crypto payments, traditional service.",
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden bg-mova-ink py-20 px-4 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-mova-mesh opacity-40" aria-hidden />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-mova-soft font-semibold mb-3">
            Why pay with Stellar
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            The future of e-commerce payments
          </h2>
          <p className="text-purple-100/70 max-w-2xl mx-auto">
            Traditional payment rails are slow and expensive. Stellar makes commerce
            faster, cheaper, and more accessible for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:border-purple-400/50 hover:bg-purple-500/10 transition-colors"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/30 text-mova-soft mb-4">
                <feature.icon size={24} />
              </span>
              <h3 className="font-semibold text-white text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-purple-100/60 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
