"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AdminGuard from "../../../components/AdminGuard";
import StellarWalletButton from "../../../components/StellarWalletButton";
import { PaymentEventIndexer, IndexedEvent, IndexerCallbacks } from "../../../lib/stellar/indexer";
import {
  dispatchOrder,
  refundOrder,
  OrderEvent,
  eventToOrder,
  OrderStatus,
  mergeOrderEvents,
} from "../../../lib/stellar/orders";
import {
  NETWORK,
  CHECKOUT_CONTRACT_ID,
  CHECKOUT_START_LEDGER,
  ADMIN_ORDERS_CURSOR_STORAGE_KEY,
} from "../../../lib/stellar/config";
import { explorerTxUrl } from "../../../lib/stellar/explorer";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  MdRefresh,
  MdCheckCircle,
  MdLocalShipping,
  MdPayment,
  MdPending,
  MdCancel,
} from "react-icons/md";
import { SiStellar } from "react-icons/si";
import Link from "next/link";

// Status badge component
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig: Record<OrderStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    Pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      icon: <MdPending className="mr-1" />,
    },
    Paid: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: <MdPayment className="mr-1" />,
    },
    Shipped: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: <MdLocalShipping className="mr-1" />,
    },
    Refunded: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: <MdCancel className="mr-1" />,
    },
    Unknown: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      icon: null,
    },
  };

  const config = statusConfig[status] || statusConfig.Unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {status}
    </span>
  );
};

// Format timestamp
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Truncate address for display
const truncateAddress = (address: string) => {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Order row component
const OrderRow = ({
  order,
  onDispatch,
  onRefund,
  isProcessing,
  error,
}: {
  order: OrderEvent;
  onDispatch: (orderId: string) => void;
  onRefund: (orderId: string) => void;
  isProcessing: boolean;
  error?: string | null;
}) => {
  const canDispatch = order.status === "Paid";
  const canRefund = order.status === "Paid";

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="font-mono text-xs text-gray-600">{truncateAddress(order.orderId)}</div>
      </td>
      <td className="py-4 px-4">
        <div className="font-mono text-xs text-gray-600">{truncateAddress(order.buyer)}</div>
      </td>
      <td className="py-4 px-4">
        <div className="font-semibold">
          {order.amount} {order.tokenSymbol}
        </div>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(order.timestamp)}</td>
      <td className="py-4 px-4 text-sm">
        <a
          href={explorerTxUrl(order.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-mono text-xs"
        >
          {truncateAddress(order.txHash)}
        </a>
      </td>
      <td className="py-4 px-4">
        <div className="flex gap-2">
          {canDispatch && (
            <button
              onClick={() => onDispatch(order.orderId)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isProcessing ? (
                <AiOutlineLoading3Quarters className="animate-spin" />
              ) : (
                <MdLocalShipping />
              )}
              Ship
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => onRefund(order.orderId)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isProcessing ? <AiOutlineLoading3Quarters className="animate-spin" /> : <MdCancel />}
              Refund
            </button>
          )}
          {!canDispatch && !canRefund && <span className="text-gray-400 text-sm">-</span>}
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </div>
        )}
      </td>
    </tr>
  );
};

// Main orders management content
const OrdersManagementContent = () => {
  const [orders, setOrders] = useState<Map<string, OrderEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [orderSuccesses, setOrderSuccesses] = useState<Record<string, string>>({});
  const [indexerStatus, setIndexerStatus] = useState<{
    running: boolean;
    eventsSeen: number;
  }>({ running: false, eventsSeen: 0 });

  // Keep the running indexer and the callbacks it was started with reachable
  // from the Refresh button, so "refresh" re-polls the live indexer in place
  // instead of reloading the document (which would restart the scan and drop
  // the in-memory order map).
  const indexerRef = useRef<PaymentEventIndexer | null>(null);
  const indexerCallbacksRef = useRef<IndexerCallbacks | null>(null);

  // Initialize event indexer
  useEffect(() => {
    // The admin table is an operations view: it must show orders paid long
    // before the ~8-minute rolling backfill window, and it must not re-walk
    // that window on every navigation. Scan from the durable checkout deploy
    // ledger (when configured) and persist the resume cursor so a reload
    // continues where the last scan stopped.
    const indexer = new PaymentEventIndexer({
      startLedger: CHECKOUT_START_LEDGER,
      cursorStorageKey: ADMIN_ORDERS_CURSOR_STORAGE_KEY,
    });

    const callbacks: IndexerCallbacks = {
      onEvent: (event: IndexedEvent) => {
        const order = eventToOrder(event);
        if (order) {
          setOrders((prev) => {
            const newMap = new Map(prev);
            // Update existing order or add new one
            const existing = newMap.get(order.orderId);
            if (existing) {
              newMap.set(order.orderId, mergeOrderEvents(existing, order));
            } else {
              newMap.set(order.orderId, order);
            }
            return newMap;
          });
        }
      },
      onStatus: (status) => {
        setIndexerStatus({
          running: status.running,
          eventsSeen: status.eventsSeen,
        });
        setIsLoading(false);
      },
      onError: (err) => {
        setIsLoading(false);
      },
    };

    indexerRef.current = indexer;
    indexerCallbacksRef.current = callbacks;
    indexer.start(callbacks);

    // Stop after 2 seconds of loading to show UI
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      indexer.stop();
      indexerRef.current = null;
      indexerCallbacksRef.current = null;
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Re-poll the existing indexer without a document reload. Orders already in
  // the map stay there; the refresh only adds events that landed since the last
  // poll. A no-op while the indexer is stopped or paused.
  const handleRefresh = useCallback(() => {
    const indexer = indexerRef.current;
    const callbacks = indexerCallbacksRef.current;
    if (!indexer || !callbacks) return;
    indexer.refresh(callbacks);
  }, []);

  // Confirmation dialog state for irreversible escrow actions.
  const [confirmAction, setConfirmAction] = useState<{
    type: "dispatch" | "refund";
    orderId: string;
    amount: string;
    tokenSymbol: string;
  } | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  // Ask the admin to explicitly confirm an irreversible value transfer.
  // Resolves true only when the admin clicks the confirm button.
  const requestConfirmation = useCallback(
    (action: {
      type: "dispatch" | "refund";
      orderId: string;
      amount: string;
      tokenSymbol: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        confirmResolverRef.current = resolve;
        setConfirmAction(action);
      });
    },
    []
  );

  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmAction(null);
    if (resolver) {
      resolver(confirmed);
    }
  }, []);

  // Handle dispatch order
  const handleDispatch = useCallback(async (orderId: string) => {
    setProcessingOrderId(orderId);
    setOrderErrors((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setOrderSuccesses((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });

    try {
      const order = orders.get(orderId);
      const confirmed = await requestConfirmation({
        type: "dispatch",
        orderId,
        amount: order?.amount ?? "unknown",
        tokenSymbol: order?.tokenSymbol ?? "",
      });
      if (!confirmed) {
        setProcessingOrderId(null);
        return;
      }

      const result = await dispatchOrder(orderId);

      if (result.success) {
        setOrderSuccesses((prev) => ({
          ...prev,
          [orderId]: `Order ${truncateAddress(orderId)} dispatched successfully!`,
        }));
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, { ...existing, status: "Shipped" });
          }
          return newMap;
        });
      } else {
        setOrderErrors((prev) => ({
          ...prev,
          [orderId]: result.error || "Failed to dispatch order",
        }));
      }
    } catch (err) {
      setOrderErrors((prev) => ({
        ...prev,
        [orderId]: err instanceof Error ? err.message : "Unknown error occurred",
      }));
    } finally {
      setProcessingOrderId(null);
    }
  }, [orders, requestConfirmation]);

  // Handle refund order
  const handleRefund = useCallback(async (orderId: string) => {
    setProcessingOrderId(orderId);
    setOrderErrors((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setOrderSuccesses((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });

    try {
      const order = orders.get(orderId);
      const confirmed = await requestConfirmation({
        type: "refund",
        orderId,
        amount: order?.amount ?? "unknown",
        tokenSymbol: order?.tokenSymbol ?? "",
      });
      if (!confirmed) {
        setProcessingOrderId(null);
        return;
      }

      const result = await refundOrder(orderId);

      if (result.success) {
        setOrderSuccesses((prev) => ({
          ...prev,
          [orderId]: `Order ${truncateAddress(orderId)} refunded successfully!`,
        }));
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, { ...existing, status: "Refunded" });
          }
          return newMap;
        });
      } else {
        setOrderErrors((prev) => ({
          ...prev,
          [orderId]: result.error || "Failed to refund order",
        }));
      }
    } catch (err) {
      setOrderErrors((prev) => ({
        ...prev,
        [orderId]: err instanceof Error ? err.message : "Unknown error occurred",
      }));
    } finally {
      setProcessingOrderId(null);
    }
  }, [orders, requestConfirmation]);

  // Sort orders by timestamp (newest first) and derive the status counts in a
  // single pass. Both are pure functions of the order map, so memoise them:
  // without this every indexer event - and every dispatch/refund state update -
  // re-sorts the whole list and walks it once more per status during render.
  const { sortedOrders, stats } = useMemo(() => {
    const sorted = Array.from(orders.values()).sort((a, b) => b.timestamp - a.timestamp);

    const counts: Record<OrderStatus, number> = {
      Pending: 0,
      Paid: 0,
      Shipped: 0,
      Refunded: 0,
      Unknown: 0,
    };
    for (const order of sorted) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }

    return {
      sortedOrders: sorted,
      stats: {
        total: sorted.length,
        pending: counts.Pending,
        paid: counts.Paid,
        shipped: counts.Shipped,
        refunded: counts.Refunded,
      },
    };
  }, [orders]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>
          <p className="text-gray-500 mt-1">
            Manage Stellar escrow orders - dispatch or refund payments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StellarWalletButton />
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to Products
          </Link>
        </div>
      </div>

      {/* Network Info */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
        <SiStellar className="text-purple-600 text-xl" />
        <div>
          <span className="font-medium text-purple-800">Stellar {NETWORK.toUpperCase()}</span>
          <span className="text-purple-600 ml-2 text-sm">
            Contract: {truncateAddress(CHECKOUT_CONTRACT_ID)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-purple-600">
          <span
            className={`w-2 h-2 rounded-full ${
              indexerStatus.running ? "bg-green-500" : "bg-purple-500"
            }`}
          />
          {indexerStatus.eventsSeen} events indexed
        </div>
      </div>

      {/* Messages */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm flex items-center gap-1">
            <MdPending /> Pending
          </div>
          <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm flex items-center gap-1">
            <MdPayment /> Paid (Escrow)
          </div>
          <div className="text-2xl font-bold text-blue-800">{stats.paid}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm flex items-center gap-1">
            <MdLocalShipping /> Shipped
          </div>
          <div className="text-2xl font-bold text-green-800">{stats.shipped}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-purple-600 text-sm flex items-center gap-1">
            <MdCancel /> Refunded
          </div>
          <div className="text-2xl font-bold text-purple-800">{stats.refunded}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-800"
          >
            <MdRefresh /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <AiOutlineLoading3Quarters className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading orders from blockchain...</p>
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <SiStellar className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No orders found</p>
            <p className="text-gray-400 text-sm">
              Orders will appear here when customers pay with Stellar USDC
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <caption className="sr-only">
                Escrow orders with their buyer, amount, status, date, transaction hash, and
                available admin actions
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TX Hash
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    onDispatch={handleDispatch}
                    onRefund={handleRefund}
                    isProcessing={processingOrderId === order.orderId}
                    error={orderErrors[order.orderId]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-700 mb-3">How it works:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <MdPayment className="text-blue-500 mt-0.5" />
            <span>
              <strong>Paid (Escrow):</strong> Customer has paid and funds are held in the smart
              contract escrow
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MdLocalShipping className="text-green-500 mt-0.5" />
            <span>
              <strong>Ship:</strong> Release the escrowed funds to your merchant wallet when you
              ship the order
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MdCancel className="text-purple-500 mt-0.5" />
            <span>
              <strong>Refund:</strong> Return the escrowed funds to the customer's wallet (e.g., if
              item is out of stock)
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Note: Only the merchant wallet that deployed the contract can dispatch/refund orders. Make
          sure you're connected with the correct Freighter wallet.
        </p>
      </div>

      {/* Confirmation dialog for irreversible escrow actions */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2
              id="confirm-action-title"
              className="text-lg font-semibold text-gray-800 mb-2"
            >
              {confirmAction.type === "dispatch"
                ? "Confirm dispatch and release escrow"
                : "Confirm refund from escrow"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.type === "dispatch"
                ? "This will release the escrowed funds to the merchant wallet. This action cannot be undone on-chain."
                : "This will return the escrowed funds to the buyer's wallet. This action cannot be undone on-chain."}
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Order</span>
                <span className="font-mono text-gray-800">
                  {truncateAddress(confirmAction.orderId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-800">
                  {confirmAction.amount} {confirmAction.tokenSymbol}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => resolveConfirmation(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resolveConfirmation(true)}
                className={`px-4 py-2 text-white rounded ${
                  confirmAction.type === "dispatch"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {confirmAction.type === "dispatch" ? "Release escrow" : "Refund buyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with AdminGuard
const OrdersManagement = () => {
  return (
    <AdminGuard>
      <OrdersManagementContent />
    </AdminGuard>
  );
};

export default OrdersManagement;
