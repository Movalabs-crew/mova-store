import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { register } from "../../instrumentation";

const REQUIRED_VARS: Record<string, string> = {
  NEXT_PUBLIC_CHECKOUT_CONTRACT_ID: "CCHECKOUT123456789",
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: "service_123",
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: "template_456",
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "pk_789",
  NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_key_123",
};

describe("startup environment validation (instrumentation.ts)", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of Object.keys(REQUIRED_VARS)) {
      original[name] = process.env[name];
    }
    original.NEXT_RUNTIME = process.env.NEXT_RUNTIME;
    original.NEXT_PHASE = process.env.NEXT_PHASE;

    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("aborts startup when a required variable is missing", async () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(register()).rejects.toThrow(
      /Startup aborted: the environment configuration is invalid/
    );
    await expect(register()).rejects.toThrow(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);
  });

  it("resolves when every required variable is present", async () => {
    Object.assign(process.env, REQUIRED_VARS);

    await expect(register()).resolves.toBeUndefined();
  });

  it("skips validation outside the nodejs runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;

    await expect(register()).resolves.toBeUndefined();
  });

  it("skips validation during the production build phase", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;

    await expect(register()).resolves.toBeUndefined();
  });
});
