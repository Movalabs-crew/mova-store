import { useEffect, useMemo, useState } from "react";

import { payWithStellar } from "../lib/stellar/checkout";
import { connectWallet, currentAddress, WalletError } from "../lib/stellar/freighter";

/**
 * Pay the current cart total with USDC on Stellar (via Freighter).
 */
const StellarCheckoutButton = ({ amountUsd, orderId, onSuccess, disabled = false }) => {
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const generatedOrderId = useMemo(
    () => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    []
  );
  const effectiveOrderId = orderId || generatedOrderId;

  useEffect(() => {
    let cancelled = false;
    currentAddress().then((addr) => {
      if (!cancelled && addr) setPublicKey(addr);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePay = async () => {
    setError("");
    setResult(null);
    setBusy(true);
    setMessage("Connecting wallet…");

    let key = publicKey;
    if (!key) {
      try {
        key = await connectWallet();
        setPublicKey(key);
      } catch (e) {
        setBusy(false);
        setError(e instanceof WalletError ? e.message : "Could not connect to Freighter.");
        return;
      }
    }

    try {
      const res = await payWithStellar({
        amountUsd,
        orderId: effectiveOrderId,
        publicKey: key,
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
            <span className="flex items-center gap-2 font-semibold">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {message || "Processing…"}
            </span>
          </>
        ) : result ? (
          <>
            <span className="font-semibold">Payment confirmed ✓</span>
            <span className="text-xs text-white/80">
              ${Number(result.amountUsd).toFixed(2)} USDC · order {effectiveOrderId}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">
              Pay with USDC{amountUsd ? ` · $${Number(amountUsd).toFixed(2)}` : ""}
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
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 text-center">
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
              Preflight: {result.simulation.instructions.toLocaleString()} CPU instr · min
              resource fee {result.simulation.minResourceFeeStroops} stroops · total budget{" "}
              {result.simulation.recommendedInclusionFeeStroops} stroops
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StellarCheckoutButton;
