import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPage from "../../app/profile/login/page";
import * as auth from "../../lib/auth";

vi.mock("../../lib/auth", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  loginWithGoogle: vi.fn(),
}));

describe("AuthPage - Google OAuth Loading & Disabled State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables Google button while loginWithGoogle is pending and calls it once on multiple clicks", async () => {
    let resolveGoogle: (val?: any) => void;
    const googlePromise = new Promise((resolve) => {
      resolveGoogle = resolve;
    });

    vi.mocked(auth.loginWithGoogle).mockReturnValue(googlePromise as any);

    render(<AuthPage />);

    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    expect(googleBtn).not.toBeDisabled();

    // First click
    fireEvent.click(googleBtn);
    expect(auth.loginWithGoogle).toHaveBeenCalledTimes(1);

    // Second click while pending
    fireEvent.click(googleBtn);
    expect(auth.loginWithGoogle).toHaveBeenCalledTimes(1);

    // Button should be disabled and show loading indicator
    expect(googleBtn).toBeDisabled();
    expect(screen.getByText(/connecting with google/i)).toBeInTheDocument();

    // Resolve Google login
    resolveGoogle!();
    await waitFor(() => {
      expect(googleBtn).not.toBeDisabled();
    });
  });

  it("re-enables Google button and surfaces error when loginWithGoogle rejects", async () => {
    vi.mocked(auth.loginWithGoogle).mockRejectedValue(new Error("OAuth popup closed by user"));

    render(<AuthPage />);

    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText("OAuth popup closed by user")).toBeInTheDocument();
    });

    expect(googleBtn).not.toBeDisabled();
  });
});
