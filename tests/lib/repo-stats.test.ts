import { describe, it, expect, vi } from "vitest";
import {
  GITHUB_REPO,
  UNAVAILABLE_REPO_STATS,
  fetchRepoStats,
  formatCount,
  parseLastPage,
} from "../../lib/repoStats";

/** Minimal stand-in for the parts of Response that fetchRepoStats reads. */
function jsonResponse(body: unknown, init: { ok?: boolean; link?: string } = {}) {
  return {
    ok: init.ok ?? true,
    json: async () => body,
    headers: {
      get: (name: string) => (name.toLowerCase() === "link" ? (init.link ?? null) : null),
    },
  } as unknown as Response;
}

describe("formatCount", () => {
  it("formats a known count", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(7)).toBe("7");
    expect(formatCount(1234)).toBe("1,234");
  });

  it("renders an unknown count as an em dash rather than a plausible number", () => {
    expect(formatCount(null)).toBe("—");
    expect(formatCount(Number.NaN)).toBe("—");
  });
});

describe("parseLastPage", () => {
  it("reads the total out of a paginated Link header", () => {
    const link =
      '<https://api.github.com/repositories/1/contributors?per_page=1&page=2>; rel="next", ' +
      '<https://api.github.com/repositories/1/contributors?per_page=1&page=17>; rel="last"';

    expect(parseLastPage(link)).toBe(17);
  });

  it("returns null when there is no last link", () => {
    expect(parseLastPage(null)).toBe(null);
    expect(parseLastPage("")).toBe(null);
    expect(
      parseLastPage(
        '<https://api.github.com/repositories/1/contributors?per_page=1&page=2>; rel="next"'
      )
    ).toBe(null);
  });
});

describe("fetchRepoStats", () => {
  it("returns the counts the API reports", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stargazers_count: 137, forks_count: 42 }))
      .mockResolvedValueOnce(
        jsonResponse([{ login: "someone" }], {
          link: '<https://api.github.com/x?per_page=1&page=21>; rel="last"',
        })
      );

    const stats = await fetchRepoStats(fetcher as unknown as typeof fetch);

    expect(stats).toEqual({ stars: 137, forks: 42, contributors: 21, source: "github" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0][0])).toContain(GITHUB_REPO);
    expect(String(fetcher.mock.calls[1][0])).toContain(`${GITHUB_REPO}/contributors`);
  });

  it("falls back to the page size when the Link header is missing", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stargazers_count: 1, forks_count: 2 }))
      .mockResolvedValueOnce(jsonResponse([{ login: "someone" }]));

    await expect(fetchRepoStats(fetcher as unknown as typeof fetch)).resolves.toEqual({
      stars: 1,
      forks: 2,
      contributors: 1,
      source: "github",
    });
  });

  it("fails closed when the API answers with an error status", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "rate limited" }, { ok: false }));

    await expect(fetchRepoStats(fetcher as unknown as typeof fetch)).resolves.toEqual(
      UNAVAILABLE_REPO_STATS
    );
  });

  it("does not throw when the request itself rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(fetchRepoStats(fetcher as unknown as typeof fetch)).resolves.toEqual(
      UNAVAILABLE_REPO_STATS
    );
  });

  it("keeps the repository counts when only the contributors request fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stargazers_count: 9, forks_count: 4 }))
      .mockRejectedValueOnce(new Error("contributors exploded"));

    await expect(fetchRepoStats(fetcher as unknown as typeof fetch)).resolves.toEqual({
      stars: 9,
      forks: 4,
      contributors: null,
      source: "github",
    });
  });

  it("ignores a payload that is missing the counters", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ stargazers_count: "a lot", forks_count: null }))
      .mockResolvedValueOnce(jsonResponse({ not: "an array" }));

    await expect(fetchRepoStats(fetcher as unknown as typeof fetch)).resolves.toEqual(
      UNAVAILABLE_REPO_STATS
    );
  });
});
