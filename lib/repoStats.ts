/**
 * Live repository statistics for the landing page.
 *
 * The About page used to publish literal star, fork and contributor counts that
 * nobody updated (and that nobody could verify), on a page whose pitch is
 * "verify it on-chain". They are read from the GitHub REST API instead, so they
 * age out on their own rather than drifting out of date in source.
 *
 * Every field is `number | null`: a figure GitHub cannot answer becomes `null`
 * and is rendered as "—", never as a plausible-looking default.
 */

export const GITHUB_REPO = "Movalabs-crew/mova-store";

export const REPO_URL = `https://github.com/${GITHUB_REPO}`;

export interface RepoStats {
  stars: number | null;
  forks: number | null;
  contributors: number | null;
  /** `"github"` once at least one figure came back, `"unavailable"` otherwise. */
  source: "github" | "unavailable";
}

export const UNAVAILABLE_REPO_STATS: RepoStats = {
  stars: null,
  forks: null,
  contributors: null,
  source: "unavailable",
};

const API = "https://api.github.com";

const REQUEST_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "mova-store-landing",
};

/**
 * Reads the total page count out of a `Link` header.
 *
 * `GET /contributors` returns one page at a time, so with `per_page=1` the
 * `rel="last"` URL is the only way to learn the total without downloading every
 * page. Returns `null` when the header is absent or has no `last` link.
 */
export function parseLastPage(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (!match) return null;
  const page = Number(match[1]);
  return Number.isFinite(page) ? page : null;
}

/** Formats a count for display, rendering an unknown figure as an em dash. */
export function formatCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Fetches the star, fork and contributor counts. Never throws: a failed or
 * malformed response leaves those fields `null` so the caller can say the
 * figures are unavailable instead of showing a stale number.
 */
export async function fetchRepoStats(fetcher: typeof fetch = fetch): Promise<RepoStats> {
  let stars: number | null = null;
  let forks: number | null = null;
  let contributors: number | null = null;

  try {
    const response = await fetcher(`${API}/repos/${GITHUB_REPO}`, { headers: REQUEST_HEADERS });
    if (response.ok) {
      const repo = await response.json();
      if (typeof repo?.stargazers_count === "number") stars = repo.stargazers_count;
      if (typeof repo?.forks_count === "number") forks = repo.forks_count;
    }
  } catch {
    // Leave the counters null; the caller reports them as unavailable.
  }

  try {
    const response = await fetcher(`${API}/repos/${GITHUB_REPO}/contributors?per_page=1`, {
      headers: REQUEST_HEADERS,
    });
    if (response.ok) {
      const pageCount = parseLastPage(response.headers.get("link"));
      const people = await response.json();
      contributors = pageCount ?? (Array.isArray(people) ? people.length : null);
    }
  } catch {
    // Leave the contributor count null.
  }

  const known = stars !== null || forks !== null || contributors !== null;
  return { stars, forks, contributors, source: known ? "github" : "unavailable" };
}
