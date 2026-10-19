import { describe, it, expect, vi } from "vitest";

// The funding branch in `loadAccount` is gated on `!IS_MAINNET`. `vi.mock` is
// file-scoped, so the mainnet half of that condition — a missing account is a
// hard error and friendbot is never consulted — lives in this file rather than
// account.test.ts (issue #548).
vi.mock("../../../lib/stellar/config", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../../lib/stellar/config")>();
  return {
    ...mod,
    IS_MAINNET: true,
  };
});

import { loadAccount } from "../../../lib/stellar/account";
import { parseError } from "../../../lib/errors";

describe("loadAccount on mainnet (issue #548)", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("fails hard for a missing account without calling friendbot", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const stubServer = {
      getAccount: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("Account not found"), { status: 404 })),
    };

    const err = await loadAccount(stubServer as never, dummyPublicKey, { fund: true }).catch(
      (e) => e
    );

    expect(err).toMatchObject({ name: "WalletError", code: "ACCOUNT_NOT_FOUND" });
    expect(err.message).toContain("Fund it with XLM before paying");
    expect(parseError(err)).toMatchObject({ code: "ACCOUNT_NOT_FUNDED" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stubServer.getAccount).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("returns an existing account without touching friendbot", async () => {
    const dummyAccount = { id: dummyPublicKey, sequence: "3" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const stubServer = { getAccount: vi.fn().mockResolvedValue(dummyAccount) };

    const result = await loadAccount(stubServer as never, dummyPublicKey, { fund: true });

    expect(result).toEqual({ account: dummyAccount, funded: false });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
