import { useEffect, useMemo, useRef, useState } from "react";
import { SiStellar } from "react-icons/si";

import { payWithStellar } from "../lib/stellar/checkout";
import { defaultToken } from "../lib/stellar/config";
import { resolveXlmUsdRate, XlmRateUnavailableError } from "../lib/stellar/price";
import {
  connectWallet,
  currentAddress,
  shortAddress,
  watchWalletChanges,
  WalletError,
} from "../lib/stellar/freighter";

/**
 * Pay the current cart total with USDC or native XLM on Stellar (via Freighter).
 */
const StellarCheckoutButton = ({
  amountUsd,
  orderId,
  onSuccess,
  disabled = false,
  token = defaultToken(),
  tokenAmount = null,
  xlmUsdPrice = undefined,
}) => {
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const addressRef = useRef("");

  const generatedOrderId = useMemo(() => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, []);
  const effectiveOrderId = orderId || generatedOrderId;

  const xlmRate = useMemo(
    () => (token?.isNative ? resolveXlmUsdRate(xlmUsdPrice) : null),
    [token, xlmUsdPrice]
  );

  const effectiveXlmAmount = useMemo(() => {
    if (!token?.isNative || !xlmRate) return null;
    return tokenAmount ?? amountUsd / xlmRate.usdPerXlm;
  }, [token, xlmRate, tokenAmount, amountUsd]);

  const xlmAmountLabel = token?.isNative
    ? effectiveXlmAmount != null
      ? `~${effectiveXlmAmount.toFixed(2)} XLM`
      : tokenAmount != null
        ? `~${tokenAmount.toFixed(2)} XLM`
        : "XLM amount unavailable"
    : null;

  useEffect(() => {
    let cancelled = false;
    currentAddress().then((addr) => {
      if (!cancelled && addr) {
        addressRef.current = addr;
        setPublicKey(addr);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Invalidate the cached address as soon as Freighter reports a change, so a
  // switched or disconnected account is never used to sign a payment.
  useEffect(() => {
    const stop = watchWalletChanges(({ address }) => {
      const previous = addressRef.current;
      addressRef.current = address;
      setPublicKey(address);
      if (address && previous && previous !== address) {
        setError(
          `Active Freighter account changed to ${shortAddress(address)}. Review and pay again.`
        );
      } else if (!address && previous) {
        setError("Freighter disconnected. Reconnect your wallet to continue.");
      }
    });
    return () => {
      if (typeof stop === "function") stop();
    };
  }, []);

  const handlePay = async () => {
    setError("");
    setResult(null);
    setBusy(true);
    setMessage("Connecting wallet…");

    if (token?.isNative && !xlmRate && tokenAmount == null) {
      setBusy(false);
      setError(new XlmRateUnavailableError().message);
      return;
    }

    let key = publicKey;
    if (!key) {
      try {
        key = await connectWallet();
        addressRef.current = key;
        setPublicKey(key);
      } catch (e) {
        setBusy(false);
        setError(e instanceof WalletError ? e.message : "Could not connect to Freighter.");
        return;
      }
    } else {
      // Re-read the live address: the wallet may have changed since mount even
      // if the change notification was missed.
      const live = await currentAddress();
      if (live !== key) {
        addressRef.current = live ?? "";
        setPublicKey(live ?? "");
        setBusy(false);
        setError(
          live
            ? `Active Freighter account changed to ${shortAddress(live)}. Review and pay again.`
            : "Freighter disconnected. Reconnect your wallet to continue."
        );
        return;
      }
    }

    try {
      const res = await payWithStellar({
        amountUsd,
        tokenAmount: effectiveXlmAmount ?? undefined,
        orderId: effectiveOrderId,
        publicKey: key,
        token,
        xlmUsdPrice: xlmRate?.usdPerXlm,
        onStatus: (msg) => setMessage(msg),
      });
      setResult(res);
      setMessage("");
      if (onSuccess) onSuccess(res);
    } catch (e) {
      setError(e instanceof WalletError ? e.message : e.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || busy || Boolean(result)}
        className={`w-full flex flex-col items-center justify-center gap-1 py-3 rounded transition-colors disabled:opacity-60 ${
          result ? "bg-green-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
      >
        {busy ? (
          <>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {message || "Processing…"}
            </span>
          </>
        ) : result ? (
          <>
            <span className="font-semibold">Payment confirmed ✓</span>
            <span className="text-xs text-white/80">
              {token?.isNative
                ? `~${Number(result.tokenAmount).toFixed(2)} XLM ($${Number(result.amountUsd).toFixed(2)})`
                : `$${Number(result.amountUsd).toFixed(2)} ${result.tokenSymbol || token?.symbol || "USDC"}`}{" "}
              · order {effectiveOrderId}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center gap-2 font-semibold">
              {token?.isNative && <SiStellar className="inline-block" size={16} />}
              {token?.isNative
                ? `Pay with XLM · ~${effectiveXlmAmount?.toFixed(2)} XLM ($${Number(amountUsd).toFixed(2)})`
                : `Pay with USDC${amountUsd ? ` · $${Number(amountUsd).toFixed(2)}` : ""}`}
            </span>
            <span className="text-xs text-white/80">From your Stellar wallet (Freighter)</span>
          </>
        )}
      </button>

      {error && (
        <span className="text-xs text-red-600 text-center" role="alert">
          {error}
        </span>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 text-center"
        >
          Paid on ledger {result.receipt ? result.receipt.ledger : "—"} · tx{" "}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {result.hash.slice(0, 12)}…
          </a>
          {result.simulation && (
            <div className="mt-1 text-[11px] text-green-800/80">
              Preflight: {result.simulation.instructions.toLocaleString()} CPU instr · min resource
              fee {result.simulation.minResourceFeeStroops} stroops · total budget{" "}
              {result.simulation.recommendedInclusionFeeStroops} stroops
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StellarCheckoutButton;
