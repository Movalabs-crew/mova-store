import Image from "next/image";
import { FaGithub, FaStar, FaCodeBranch, FaUsers } from "react-icons/fa";
import { SiStellar } from "react-icons/si";

const stats = [
  { label: "Transactions", value: "1,200+", icon: SiStellar },
  { label: "Countries Served", value: "30+", icon: FaUsers },
  { label: "Avg Settlement", value: "~4 sec", icon: null },
  { label: "Transaction Fee", value: "<$0.01", icon: null },
];

export default function AboutUs() {
  return (
    <section id="aboutus" className="bg-gray-900 text-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Mission Statement */}
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-widest text-red-400 font-semibold mb-3">
            Our Mission
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">
            Bringing Stellar payments to everyday commerce
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
            ShoeSafari is more than a shoe store — it's a working proof-of-concept
            showing how any e-commerce business can accept Stellar USDC payments
            with instant settlement, near-zero fees, and full transparency.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center"
            >
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                {stat.icon && <stat.icon size={14} />}
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* OSS Section */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <FaGithub className="text-2xl" />
                <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Open Source
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Built in public, for everyone
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                ShoeSafari is fully open source under the MIT license. Fork it,
                learn from it, or contribute to make crypto payments accessible
                to more merchants worldwide.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/ShoeSafari-Hub/ShoeSafari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FaGithub size={18} />
                  View on GitHub
                </a>
                <a
                  href="https://github.com/ShoeSafari-Hub/ShoeSafari/fork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-gray-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaCodeBranch size={16} />
                  Fork Project
                </a>
              </div>
            </div>

            {/* GitHub Stats */}
            <div className="flex flex-col gap-4 min-w-[200px]">
              <div className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3">
                <FaStar className="text-yellow-400 text-xl" />
                <div>
                  <p className="text-xl font-bold">120+</p>
                  <p className="text-xs text-gray-400">GitHub Stars</p>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3">
                <FaCodeBranch className="text-green-400 text-xl" />
                <div>
                  <p className="text-xl font-bold">45+</p>
                  <p className="text-xs text-gray-400">Forks</p>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3">
                <FaUsers className="text-blue-400 text-xl" />
                <div>
                  <p className="text-xl font-bold">15+</p>
                  <p className="text-xs text-gray-400">Contributors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
