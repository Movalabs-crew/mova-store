import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Navbar from "../../components/Navbar";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("next/link", () => ({
  default: (props) => <a {...props} />,
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("../../lib/auth", () => ({
  logout: vi.fn(),
}));

afterEach(() => {
  mockRouter.push.mockClear();
  mockRouter.pathname = "/";
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("Navbar anchor links", () => {
  it("smooth-scrolls to the section when it exists on the current page", () => {
    mockRouter.pathname = "/";
    const section = document.createElement("section");
    section.id = "aboutus";
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    render(<Navbar />);
    screen.getByText("About Us").click();

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("navigates home first when the section is not on the current page", () => {
    mockRouter.pathname = "/shop";
    render(<Navbar />);
    screen.getByText("About Us").click();

    expect(mockRouter.push).toHaveBeenCalledWith("/#aboutus");
  });

  it("scrolls to the section once the home page has rendered", () => {
    vi.useFakeTimers();
    mockRouter.pathname = "/shop";
    const section = document.createElement("section");
    section.id = "aboutus";
    section.scrollIntoView = vi.fn();

    const { rerender } = render(<Navbar />);
    screen.getByText("About Us").click();
    expect(mockRouter.push).toHaveBeenCalledWith("/#aboutus");

    // Simulate arriving on the home page with the section rendered.
    mockRouter.pathname = "/";
    document.body.appendChild(section);
    rerender(<Navbar />);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});
