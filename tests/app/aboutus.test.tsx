import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AboutUs from "../../app/(landingpage)/Aboutus";

const fetchMock = vi.fn();

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

describe("Aboutus repository statistics (#592)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the counts the API returns and credits GitHub", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ stars: 137, forks: 42, contributors: 21, source: "github" })
    );

    render(<AboutUs />);

    await waitFor(() => {
      expect(screen.getByText("137")).toBeInTheDocument();
    });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText(/live from/i)).toBeInTheDocument();

    // The literal figures the page used to publish as fact are gone.
    expect(screen.queryByText("120+")).toBeNull();
    expect(screen.queryByText("45+")).toBeNull();
    expect(screen.queryByText("15+")).toBeNull();
  });

  it("says the figures are unavailable instead of showing a number nobody measured", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ stars: null, forks: null, contributors: null, source: "unavailable" })
    );

    render(<AboutUs />);

    await waitFor(() => {
      expect(screen.getByText(/live stats unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.queryByText("120+")).toBeNull();
    expect(screen.queryByText("15+")).toBeNull();
  });

  it("handles the stats request failing outright", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    render(<AboutUs />);

    await waitFor(() => {
      expect(screen.getByText(/live stats unavailable/i)).toBeInTheDocument();
    });
  });

  it("labels the figures it cannot source as illustrative", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ stars: 3, forks: 5, contributors: 7, source: "github" })
    );

    render(<AboutUs />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    const note = screen.getByText(/illustrative pilot targets/i);
    expect(note).toHaveAttribute("id", "illustrative-figures-note");

    // The grid points at the note, so the label travels with the numbers.
    const grid = screen.getByText("1,200+").closest("[aria-describedby]");
    expect(grid).toHaveAttribute("aria-describedby", "illustrative-figures-note");
  });
});
