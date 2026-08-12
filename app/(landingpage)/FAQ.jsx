"use client";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const faqs = [
  {
    question: "What is Stellar and USDC?",
    answer: "Stellar is a fast, low-cost blockchain network designed for payments. USDC is a stablecoin pegged to the US dollar — 1 USDC always equals $1. When you pay with USDC on Stellar, you get the speed of crypto with the stability of dollars.",
  },
  {
    question: "Do I need cryptocurrency experience?",
    answer: "Not at all! If you can install a browser extension and click 'approve,' you can pay with Stellar. Our checkout guides you through every step, and the Freighter wallet is designed to be beginner-friendly.",
  },
  {
    question: "How do I get USDC for my wallet?",
    answer: "You can buy USDC on exchanges like Coinbase, Binance, or Kraken, then send it to your Stellar wallet address. Some on-ramp services let you buy directly with a card. We recommend starting with a small amount to test.",
  },
  {
    question: "Is my payment secure?",
    answer: "Yes. Payments are processed through a smart contract that acts as escrow. Your funds are held securely until you confirm delivery. Every transaction is recorded on the public Stellar ledger for full transparency.",
  },
  {
    question: "What if I want a refund?",
    answer: "Refunds are processed back to your Stellar wallet. Since we use escrow, if there's an issue before shipping, funds can be returned automatically. For returns after delivery, contact our support team.",
  },
  {
    question: "Can I still pay with a credit card?",
    answer: "Absolutely! Stellar payments are an option, not a requirement. We accept all major credit cards through our traditional checkout. Choose whatever works best for you.",
  },
  {
    question: "What are the fees for Stellar payments?",
    answer: "Stellar transaction fees are typically 0.00001 XLM (a tiny fraction of a cent). Compare that to 2-3% credit card fees. You keep more of your money.",
  },
  {
    question: "Is Mova Store open source?",
    answer: "Yes! Mova Store is fully open source. Developers can fork our code to add Stellar payments to their own stores. Check out our GitHub repository to see how it's built.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-purple-700 font-semibold mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-600">
            Everything you need to know about shopping with Stellar payments.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-gray-900 pr-4">
                  {faq.question}
                </span>
                <FaChevronDown
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <p className="px-5 pb-5 text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-gray-700 mb-3">
            Still have questions?
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold"
          >
            Contact our team
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
