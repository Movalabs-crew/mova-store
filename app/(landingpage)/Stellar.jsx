import { SiStellar } from "react-icons/si";
import Link from "next/link";

const steps = [
  {
    title: "Connect your Stellar wallet",
    text: "Grant ShoeSafari read access via Freighter in one click — no sign-up, no KYC.",
  },
  {
    title: "Choose USDC at checkout",
    text: "Your order total is shown in USDC automatically, at the current rate.",
  },
  {
    title: "Approve the payment",
    text: "Sign a single transaction from your wallet. That's all it takes.",
  },
  {
    title: "Get an on-chain receipt",
    text: "The smart contract moves the exact amount to our merchant wallet and records a payment event on the Stellar ledger.",
  },
];

const Stellar = () => {
  return (
    <section className="bg-gradient-to-r from-[#3f0f8f] via-[#7b2ff7] to-[#7b2ff7] py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
        <div className="md:w-1/2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm font-medium text-white">
            <SiStellar size={16} />
            Crypto checkout, built in
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Pay With Stellar
          </h2>
          <p className="text-white/90 text-lg leading-relaxed mb-8">
            Pay for your order in USDC on the Stellar network — no card, no bank
            account, no middleman. Your payment goes straight from your Stellar
            wallet to ours through a Soroban smart contract, and the receipt is
            recorded on-chain.
          </p>
          <ul className="space-y-4 text-white/90 mb-8 text-left">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Settles in seconds</strong> —
                transfers usually confirm almost instantly, not in days.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Fraction-of-a-cent fees</strong>{" "}
                — send USDC anywhere for pennies, with no card network to slow
                things down.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Verified by smart contract</strong>{" "}
                — the exact amount moves to our merchant wallet and a payment
                event is recorded on the ledger.
              </span>
            </li>
          </ul>
          <Link
            href="/shop"
            className="inline-block bg-white text-[#7b2ff7] font-semibold px-6 py-3 rounded-md hover:bg-white/90"
          >
            Shop &amp; Pay with USDC
          </Link>
        </div>

        <div className="md:w-1/2 w-full bg-white rounded-xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            How it works
          </h3>
          <ol className="space-y-6">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="h-8 w-8 flex-shrink-0 rounded-full bg-[#7b2ff7] text-white flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default Stellar;
