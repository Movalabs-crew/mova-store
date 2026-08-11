import { FaStar, FaQuoteLeft } from "react-icons/fa";
import { SiStellar } from "react-icons/si";

const testimonials = [
  {
    name: "Alex Chen",
    location: "Singapore",
    rating: 5,
    text: "First time paying with crypto for real products. The checkout was smoother than my credit card — confirmed in seconds!",
    paidWith: "USDC",
  },
  {
    name: "Maria Santos",
    location: "Brazil",
    rating: 5,
    text: "No international card fees, no currency conversion headaches. Just connected my wallet and paid. The shoes arrived in perfect condition.",
    paidWith: "USDC",
  },
  {
    name: "James Okonkwo",
    location: "Nigeria",
    rating: 5,
    text: "Finally an online store that accepts Stellar! The escrow system gave me confidence. Will definitely shop here again.",
    paidWith: "USDC",
  },
  {
    name: "Emma Larsson",
    location: "Sweden",
    rating: 5,
    text: "Love that I can verify my payment on the blockchain. Transparent, fast, and the sneakers are amazing quality.",
    paidWith: "USDC",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#fafafa] py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-red-700 font-semibold mb-3">
            Customer stories
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            What our customers say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real feedback from real customers who've experienced the future of
            e-commerce payments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <FaQuoteLeft className="text-red-200 text-2xl flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    "{testimonial.text}"
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {testimonial.location}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-0.5">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <FaStar key={i} className="text-yellow-400 text-sm" />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <SiStellar size={12} />
                        Paid with {testimonial.paidWith}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 bg-white rounded-full px-8 py-4 shadow-sm border border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">4.9</p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">500+</p>
              <p className="text-xs text-gray-500">Happy Customers</p>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">30+</p>
              <p className="text-xs text-gray-500">Countries</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
