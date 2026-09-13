import { afterEach, describe, expect, it, vi } from "vitest";
import {
  login,
  loginWithGoogle,
  logout,
  mapAuthUser,
  signup,
} from "../../lib/auth";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const auth = supabase.auth;

afterEach(() => {
  vi.resetAllMocks();
});

describe("mapAuthUser", () => {
  it("returns null for a null/undefined Supabase user", () => {
    expect(mapAuthUser(null)).toBeNull();
    expect(mapAuthUser(undefined)).toBeNull();
  });

  it("prefers full_name from user_metadata", () => {
    const user = mapAuthUser({
      id: "u1",
      email: "ada@example.com",
      user_metadata: {
        full_name: "Ada Lovelace",
        name: "should be ignored",
        display_name: "also ignored",
      },
    });
    expect(user).toEqual({
      id: "u1",
      uid: "u1",
      email: "ada@example.com",
      displayName: "Ada Lovelace",
      photoURL: null,
    });
  });

  it("falls back to name, then display_name", () => {
    expect(
      mapAuthUser({ id: "u2", email: "a@b.c", user_metadata: { name: "Grace" } })
        .displayName
    ).toBe("Grace");
    expect(
      mapAuthUser({
        id: "u3",
        email: "a@b.c",
        user_metadata: { display_name: "Katherine" },
      }).displayName
    ).toBe("Katherine");
  });

  it("falls back to the email prefix, then the 'User' default", () => {
    expect(
      mapAuthUser({ id: "u4", email: "grace@example.com", user_metadata: {} })
        .displayName
    ).toBe("grace");
    expect(mapAuthUser({ id: "u5", user_metadata: {} }).displayName).toBe(
      "User"
    );
  });

  it("prefers avatar_url over picture for the photo", () => {
    const user = mapAuthUser({
      id: "u6",
      email: "a@b.c",
      user_metadata: {
        avatar_url: "https://cdn.example.com/a.png",
        picture: "https://cdn.example.com/p.png",
      },
    });
    expect(user.photoURL).toBe("https://cdn.example.com/a.png");
    expect(
      mapAuthUser({
        id: "u7",
        email: "a@b.c",
        user_metadata: { picture: "https://cdn.example.com/p.png" },
      }).photoURL
    ).toBe("https://cdn.example.com/p.png");
  });
});

describe("login", () => {
  it("returns the mapped user on success", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "u10",
          email: "grace@example.com",
          user_metadata: { full_name: "Grace Hopper" },
        },
      },
      error: null,
    });
    const user = await login("grace@example.com", "pw");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "grace@example.com",
      password: "pw",
    });
    expect(user.displayName).toBe("Grace Hopper");
    expect(user.id).toBe("u10");
  });

  it("throws Error(message) on a mocked Supabase error", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials" },
    });
    await expect(login("grace@example.com", "bad")).rejects.toThrow(
      "Error logging in: Invalid login credentials"
    );
  });
});

describe("signup", () => {
  it("returns the mapped user on success", async () => {
    auth.signUp.mockResolvedValue({
      data: {
        user: { id: "u20", email: "new@example.com", user_metadata: {} },
      },
      error: null,
    });
    const user = await signup("new@example.com", "pw12345");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "pw12345",
    });
    expect(user.displayName).toBe("new");
  });

  it("throws Error(message) on a mocked Supabase error", async () => {
    auth.signUp.mockResolvedValue({
      data: null,
      error: { message: "User already registered" },
    });
    await expect(signup("dup@example.com", "pw")).rejects.toThrow(
      "Error signing up: User already registered"
    );
  });
});

describe("loginWithGoogle", () => {
  it("returns the OAuth data on success", async () => {
    const data = { provider: "google" };
    auth.signInWithOAuth.mockResolvedValue({ data, error: null });
    await expect(loginWithGoogle()).resolves.toBe(data);
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );
  });

  it("throws Error(message) on a mocked Supabase error", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: "OAuth rejected" },
    });
    await expect(loginWithGoogle()).rejects.toThrow(
      "Error logging in with Google: OAuth rejected"
    );
  });
});

describe("logout", () => {
  it("resolves when signOut succeeds", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(logout()).resolves.toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("throws Error(message) on a mocked Supabase error", async () => {
    auth.signOut.mockResolvedValue({
      error: { message: "Could not sign out" },
    });
    await expect(logout()).rejects.toThrow(
      "Error logging out: Could not sign out"
    );
  });
});
