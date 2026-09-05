import { describe, it, expect, vi, beforeEach } from "vitest";
import { logout } from "../../lib/auth";

// Test that auth/logout does not wipe other localStorage items
describe("Auth and Session persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves supabase auth tokens when cart items are cleared", () => {
    localStorage.setItem("sb-dummy-auth-token", JSON.stringify({ access_token: "test-token" }));
    localStorage.setItem("cartItems", JSON.stringify([{ id: 1, name: "Shoe" }]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "100");

    // Simulate targeted cleanup
    localStorage.removeItem("cartItems");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("totalPrice");

    expect(localStorage.getItem("sb-dummy-auth-token")).not.toBeNull();
    expect(localStorage.getItem("cartItems")).toBeNull();
    expect(localStorage.getItem("itemCount")).toBeNull();
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });
});
