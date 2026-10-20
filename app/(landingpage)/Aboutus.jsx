"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { FaGithub, FaStar, FaCodeBranch, FaUsers } from "react-icons/fa";
import { SiStellar } from "react-icons/si";
import { REPO_URL, UNAVAILABLE_REPO_STATS, formatCount } from "../../lib/repoStats";

// Figures nothing in this repository measures: they are the pilot's targets and
// the Stellar network's typical behaviour, so they are labelled as illustrative
// under the grid. The repository counts below are fetched and are not listed
// here, because a number the API can answer must not be written down in source.
const stats = [
  { label: "Transactions", value: "1,200+", icon: SiStellar },
  { label: "Countries Served", value: "30+", icon: FaUsers },
  { label: "Avg Settlement", value: "~4 sec", icon: null },
  { label: "Transaction Fee", value: "<$0.01", icon: null },
];

const ILLUSTRATIVE_NOTE_ID = "illustrative-figures-note";

export default function AboutUs() {
  // null while the request is in flight, so the UI can distinguish "loading"
  // from "GitHub could not answer" instead of showing an invented default.
  const [repoStats, setRepoStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/repo-stats")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setRepoStats(data ?? UNAVAILABLE_REPO_STATS);
      })
      .catch(() => {
        if (!cancelled) setRepoStats(UNAVAILABLE_REPO_STATS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const repositoryStats = [
    { key: "stars", icon: FaStar, tone: "text-yellow-400", label: "GitHub Stars" },
    { key: "forks", icon: FaCodeBranch, tone: "text-green-400", label: "Forks" },
    { key: "contributors", icon: FaUsers, tone: "text-blue-400", label: "Contributors" },
  ];

  const statsUnavailable = repoStats !== null && repoStats.source === "unavailable";

  return (
    <section id="aboutus" className="relative overflow-hidden bg-mova-ink text-white py-20 px-6">
      <div className="pointer-events-none absolute inset-0 bg-mova-mesh opacity-30" aria-hidden />
      <div className="relative max-w-6xl mx-auto">
        {/* Mission Statement */}
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-widest text-mova-soft font-semibold mb-3">
            Our Mission
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            Bringing Stellar payments to everyday commerce
          </h2>
          <p className="text-lg text-purple-100/70 leading-relaxed max-w-3xl mx-auto">
            Mova Store is more than a shoe store — it's a working proof-of-concept
            showing how any e-commerce business can accept Stellar USDC payments
            with instant settlement, near-zero fees, and full transparency.
          </p>
        </div>

        {/* Stats Grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-describedby={ILLUSTRATIVE_NOTE_ID}
        >
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
        <p
          id={ILLUSTRATIVE_NOTE_ID}
          className="text-center text-xs text-gray-400 mt-3 mb-16"
        >
          Illustrative pilot targets and typical Stellar network figures — not
          measured results from this deployment. Live repository figures are below.
        </p>

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
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Built in public, for everyone
              </h3>
              <p className="text-gray-300 leading-relaxed mb-6">
                Mova Store is fully open source under the MIT license. Fork it,
                learn from it, or contribute to make crypto payments accessible
                to more merchants worldwide.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FaGithub size={18} />
                  View on GitHub
                </a>
                <a
                  href={`${REPO_URL}/fork`}
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
              {repositoryStats.map((stat) => (
                <div
                  key={stat.key}
                  className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3"
                >
                  <stat.icon className={`${stat.tone} text-xl`} />
                  <div>
                    <p className="text-xl font-bold">
                      {repoStats === null ? "…" : formatCount(repoStats[stat.key])}
                    </p>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                </div>
              ))}

              <p className="text-xs text-gray-400" aria-live="polite">
                {repoStats === null ? (
                  "Loading live repository stats…"
                ) : statsUnavailable ? (
                  <>
                    Live stats unavailable right now —{" "}
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-200"
                    >
                      see them on GitHub
                    </a>
                  </>
                ) : (
                  <>
                    Live from{" "}
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-200"
                    >
                      GitHub
                    </a>{" "}
                    · refreshed hourly
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
