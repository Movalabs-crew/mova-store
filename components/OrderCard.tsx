"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiStellar } from "react-icons/si";
import { FaCreditCard, FaExternalLinkAlt, FaCheckCircle, FaCopy, FaCheck } from "react-icons/fa";
import { MdLocalShipping, MdPayment, MdPending, MdCancel } from "react-icons/md";
import { BuyerOrder, verifyOrderOnChain } from "../lib/buyer-orders";
import { NETWORK } from "../lib/stellar/config";

interface OrderCardProps {
  order: BuyerOrder;
}

export default function OrderCard({ order }: OrderCardProps) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [onChainResult, setOnChainResult] = useState<{
    verified?: boolean;
    onChainStatus?: string;
  } | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(order.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyOrderOnChain(order.orderId);
      setOnChainResult(res);
    } catch {
      setOnChainResult({ verified: false });
    } finally {
      setVerifying(false);
    }
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Shipped":
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <MdLocalShipping size={14} /> {status}
          </span>
        );
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <MdPayment size={14} /> Paid
          </span>
        );
      case "Refunded":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <MdCancel size={14} /> Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <MdPending size={14} /> {status || "Pending"}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="bg-purple-50/60 p-4 sm:p-5 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Order ID:</span>
            <span className="font-mono text-sm font-bold text-mova-ink">{order.orderId}</span>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy Order ID"
              aria-label="Copy Order ID"
              className="text-gray-400 hover:text-purple-600 transition-colors p-1"
            >
              {copied ? <FaCheck className="text-green-600" size={12} /> : <FaCopy size={12} />}
            </button>
          </div>
          <span className="text-xs text-gray-500">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(order.status)}
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Total</span>
            <span className="text-base font-bold text-purple-700">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="p-4 sm:p-5 divide-y divide-gray-100">
        {order.items && order.items.length > 0 ? (
          order.items.map((item, idx) => (
            <div
              key={idx}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                {item.img ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-purple-50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                    {item.name?.slice(0, 1) || "M"}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                  <span className="text-xs text-gray-500">Qty: {item.quantity || 1}</span>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-800">
                ${Number(item.price).toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="py-2 text-xs text-gray-400 italic">No item details recorded</div>
        )}
      </div>

      {/* Payment Details Footer */}
      <div className="bg-gray-50/70 p-4 sm:p-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {order.paymentMethod === "stellar" ? (
            <div className="flex items-center gap-2 text-purple-700 font-medium">
              <SiStellar size={16} />
              <span>
                Paid with Stellar ({order.tokenSymbol || "USDC"}
                {order.tokenAmount
                  ? ` · ~${order.tokenAmount.toFixed(2)} ${order.tokenSymbol}`
                  : ""}
                )
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <FaCreditCard size={15} />
              <span>Paid with Card</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {order.txHash && (
            <a
              href={`https://stellar.expert/explorer/${NETWORK}/tx/${order.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 underline font-medium"
            >
              <span>View On Explorer</span>
              <FaExternalLinkAlt size={10} />
            </a>
          )}

          {order.paymentMethod === "stellar" && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition-colors disabled:opacity-50"
            >
              {verifying
                ? "Verifying…"
                : onChainResult
                  ? onChainResult.verified
                    ? "Verified ✓"
                    : "Not Found"
                  : "Verify Contract"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
