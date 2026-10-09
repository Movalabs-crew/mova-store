/**
 * Order Management Library
 *
 * Functions for reading and managing orders via the Soroban checkout contract.
 * Used by the admin dashboard for order dispatch and refund operations.
 */

import {
  TransactionBuilder,
  Operation,
  Contract,
  rpc,
  xdr,
  Keypair,
  Address,
} from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  RPC_URL,
  NETWORK_PASSPHRASE,
  TX_TIMEOUT_SECONDS,
  TX_POLL_INTERVAL_MS,
  tokenForContract,
} from "./config";
import { connectWallet, signWithFreighter } from "./freighter";
import { hashOrderId, bytesToHex, hexToBytes, resolveOrderIdHash } from "./scval";

// `resolveOrderIdHash` is used by dispatchOrder/refundOrder below and is part of
// this module's public API, so keep it exported for callers and the test suite.
export { resolveOrderIdHash };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus = "Pending" | "Paid" | "Shipped" | "Refunded" | "Unknown";

export interface OrderDetails {
  orderId: string;
  orderIdHash: string;
  buyer: string;
  amount: bigint;
  amountDisplay: string;
  token: string;
  tokenSymbol: string;
  timestamp: number;
  status: OrderStatus;
  ledger?: number;
  txHash?: string;
}

export interface OrderActionResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Order IDs
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable, unguessable order id.
 *
 * The id is hashed to the 32-byte `order_id` that the contract treats as
 * unique: a second `create_order` for an id already registered is rejected with
 * `OrderAlreadyPaid`, so a predictable id lets an observer pre-register a
 * buyer's likely id and permanently block that checkout (#708). `Math.random()`
 * is not a CSPRNG; the entropy here comes from `crypto.getRandomValues`, which
 * keeps the `SS-<timestamp>-<6 digits>` shape that callers and support tooling
 * read.
 */
export function generateOrderId(): string {
  const entropy = new Uint32Array(1);
  crypto.getRandomValues(entropy);
  // Same 0..999_999 range the previous `Math.floor(Math.random() * 1e6)`
  // produced, without the predictable PRNG behind it.
  const suffix = entropy[0] % 1_000_000;
  return `SS-${Date.now()}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Status Conversion
// ---------------------------------------------------------------------------

function decodeStatus(statusVal: xdr.ScVal): OrderStatus {
  if (statusVal.type === "scvVec") {
    const vec = statusVal.vec;
    if (vec && vec.length > 0) {
      const first = vec[0];
      if (first.type === "scvSymbol") {
        const sym = first.sym.toString();
        if (["Pending", "Paid", "Shipped", "Refunded"].includes(sym)) {
          return sym as OrderStatus;
        }
      }
    }
  }
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Read Order from Contract
// ---------------------------------------------------------------------------

/**
 * Reads an order's details from the contract.
 */
export async function readOrder(orderId: string): Promise<OrderDetails | null> {
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CHECKOUT_CONTRACT_ID);

  const orderIdHashBytes = await resolveOrderIdHash(orderId);
  const orderIdHash = bytesToHex(orderIdHashBytes);

  const account = await server
    .getAccount(
      Keypair.random().publicKey() // dummy source for simulation
    )
    .catch(() => null);

  if (!account) {
    // Fallback: just simulate without account
    const tx = new TransactionBuilder(
      new (await import("@stellar/stellar-sdk")).Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      ),
      {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(contract.call("order", xdr.ScVal.scvBytes(hexToBytes(orderIdHash))))
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      console.error("Simulation error reading order:", simResult.error);
      return null;
    }

    if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
      return null;
    }

    const retval = simResult.result.retval;
    if (retval.type === "scvVoid") {
      return null; // Order doesn't exist
    }

    // Parse the Option<Order> - it's a vec with the order struct inside
    if (retval.type === "scvVec") {
      const vec = retval.vec;
      if (!vec || vec.length === 0) return null;

      // The order is the first (and only) element
      const orderVal = vec[0];
      if (orderVal.type !== "scvMap") return null;

      const orderMap = orderVal.map;
      if (!orderMap) return null;
      const order: Partial<OrderDetails> = {
        orderId,
        orderIdHash,
      };

      for (const entry of orderMap) {
        const key = entry.key.type === "scvSymbol" ? entry.key.sym.toString() : "";
        const val = entry.val;

        switch (key) {
          case "buyer":
            if (val.type === "scvAddress") {
              // `Address.fromScVal` handles both G... and C... strkeys, so the
              // manual accountId/ed25519 and contractId unwrapping is gone.
              order.buyer = Address.fromScVal(val).toString();
            }
            break;
          case "amount":
            if (val.type === "scvI128") {
              const parts = val.i128;
              order.amount = (parts.hi << BigInt(64)) | parts.lo;
            }
            break;
          case "token":
            if (val.type === "scvAddress") {
              order.token = Address.fromScVal(val).toString();
            }
            break;
          case "timestamp":
            if (val.type === "scvU64") {
              order.timestamp = Number(val.u64);
            }
            break;
          case "status":
            order.status = decodeStatus(val);
            break;
        }
      }

      // Format display amount
      const tokenConfig = order.token ? tokenForContract(order.token.toUpperCase()) : undefined;
      const decimals = tokenConfig?.decimals ?? 7;
      order.tokenSymbol = tokenConfig?.symbol ?? "TOKEN";
      order.amountDisplay = order.amount
        ? (Number(order.amount) / Math.pow(10, decimals)).toFixed(2)
        : "0.00";

      return order as OrderDetails;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Dispatch Order (Release Escrow to Merchant)
// ---------------------------------------------------------------------------

/**
 * Resolve the deployed checkout contract id, failing fast when it is absent.
 *
 * Read from the environment at call time rather than from the import-time
 * snapshot in `./config`, so a misconfigured deployment says so plainly instead
 * of surfacing later as an opaque simulation error. Thrown rather than returned
 * so it cannot be mistaken for a transient RPC failure, and raised outside the
 * operation's try/catch for the same reason.
 */
function requireCheckoutContractId(): string {
  const contractId = (process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID ?? "").trim();
  if (!contractId) {
    throw new Error(
      "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID is not configured. Set it to the deployed checkout contract id (C...) before dispatching or refunding orders."
    );
  }
  return contractId;
}

/**
 * Dispatches an order, releasing the escrowed funds to the merchant.
 * Requires the connected wallet to be the merchant.
 */
export async function dispatchOrder(orderId: string): Promise<OrderActionResult> {
  // Fail fast on a missing contract id, before any wallet or RPC call.
  const contractId = requireCheckoutContractId();
  try {
    const publicKey = await connectWallet();
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(contractId);

    const orderIdHashBytes = await resolveOrderIdHash(orderId);

    const account = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("dispatch", xdr.ScVal.scvBytes(orderIdHashBytes.slice())))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    // Simulate to get resource fees
    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      return {
        success: false,
        error: `Simulation failed: ${simResult.error}`,
      };
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
      return {
        success: false,
        error: "Simulation did not succeed",
      };
    }

    // Prepare transaction with simulation results
    const preparedTx = rpc.assembleTransaction(tx, simResult).build();

    // Sign with Freighter
    const signedXdr = await signWithFreighter(preparedTx.toXDR(), publicKey);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // Submit
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      return {
        success: false,
        error: `Send failed: ${sendResult.errorResult?.toXDR("base64")}`,
      };
    }

    // Poll for result
    const txHash = sendResult.hash;
    const result = await pollTransaction(server, txHash);

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Refund Order (Return Escrow to Buyer)
// ---------------------------------------------------------------------------

/**
 * Refunds an order, returning the escrowed funds to the buyer.
 * Requires the connected wallet to be the merchant.
 */
export async function refundOrder(orderId: string): Promise<OrderActionResult> {
  // Fail fast on a missing contract id, before any wallet or RPC call.
  const contractId = requireCheckoutContractId();
  try {
    const publicKey = await connectWallet();
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(contractId);

    const orderIdHashBytes = await resolveOrderIdHash(orderId);

    const account = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("refund", xdr.ScVal.scvBytes(orderIdHashBytes.slice())))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    // Simulate
    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      return {
        success: false,
        error: `Simulation failed: ${simResult.error}`,
      };
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
      return {
        success: false,
        error: "Simulation did not succeed",
      };
    }

    // Prepare and sign
    const preparedTx = rpc.assembleTransaction(tx, simResult).build();
    const signedXdr = await signWithFreighter(preparedTx.toXDR(), publicKey);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // Submit
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      return {
        success: false,
        error: `Send failed: ${sendResult.errorResult?.toXDR("base64")}`,
      };
    }

    // Poll for result
    const txHash = sendResult.hash;
    const result = await pollTransaction(server, txHash);

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Transaction Polling
// ---------------------------------------------------------------------------

async function pollTransaction(server: rpc.Server, txHash: string): Promise<OrderActionResult> {
  const startTime = Date.now();
  const timeoutMs = TX_TIMEOUT_SECONDS * 1000;

  while (Date.now() - startTime < timeoutMs) {
    const getResult = await server.getTransaction(txHash);

    if (getResult.status === "SUCCESS") {
      return {
        success: true,
        txHash,
        ledger: getResult.ledger,
      };
    }

    if (getResult.status === "FAILED") {
      return {
        success: false,
        txHash,
        error: "Transaction failed on-chain",
      };
    }

    // NOT_FOUND - still pending
    await new Promise((resolve) => setTimeout(resolve, TX_POLL_INTERVAL_MS));
  }

  return {
    success: false,
    txHash,
    error: "Transaction timed out",
  };
}

// ---------------------------------------------------------------------------
// Export Order Interface for UI
// ---------------------------------------------------------------------------

export interface OrderEvent {
  orderId: string;
  buyer: string;
  amount: string;
  amountRaw: bigint;
  token: string;
  tokenSymbol: string;
  status: OrderStatus;
  timestamp: number;
  ledger: number;
  txHash: string;
}

/**
 * Contract topic layout per event (see contracts/checkout/src/events.rs):
 *
 *   pay          -> [pay, token, buyer, merchant, order_id]
 *   create_order -> [create_order, token, buyer, order_id]
 *   dispatch     -> [dispatch, order_id, merchant]
 *   refund       -> [refund, order_id, buyer]
 *
 * Keeping the mapping here — instead of positional reads at each call site —
 * means a future contract revision only has to teach one decoder the new
 * layout. `eventToOrder` and the live order watch share this.
 */
const EVENT_ORDER_ID_TOPIC: Record<string, string> = {
  pay: "topic4",
  create_order: "topic3",
  dispatch: "topic1",
  refund: "topic1",
};

const EVENT_TOKEN_TOPIC: Record<string, string> = {
  pay: "topic1",
  create_order: "topic1",
};

/**
 * Resolves the order id from an indexed event using the contract's declared
 * topic layout. The single source of truth shared by {@link eventToOrder} and
 * `components/StellarOrderWatch.jsx`.
 */
export function eventOrderId(event: { symbol: string; fields: Record<string, string> }): string {
  const explicit = event.fields.order_id;
  if (explicit) return explicit;
  const layoutTopic = EVENT_ORDER_ID_TOPIC[event.symbol];
  // Unknown symbols keep the legacy `topic1` fallback so an unrecognised event
  // is not silently dropped.
  return layoutTopic ? (event.fields[layoutTopic] ?? "") : (event.fields.topic1 ?? "");
}

/**
 * Converts an indexed event to an OrderEvent for display.
 */
export function eventToOrder(
  event: {
    fields: Record<string, string>;
    symbol: string;
    ledger: number;
    txHash: string;
  },
  existingStatus?: OrderStatus
): OrderEvent | null {
  const { fields, symbol, ledger, txHash } = event;

  // Determine status from event type
  let status: OrderStatus;
  switch (symbol) {
    case "pay":
      status = "Paid";
      break;
    case "create_order":
      status = "Pending";
      break;
    case "dispatch":
      status = "Shipped";
      break;
    case "refund":
      status = "Refunded";
      break;
    default:
      status = existingStatus ?? "Unknown";
  }

  // Extract fields. The contract declares a different topic layout per event
  // (`contracts/checkout/src/events.rs`) and the indexer exposes `topics[1..]`
  // as `topic1..topicN`. Reading `topic1` as the order id for every event made
  // a `pay`/`create_order` event resolve to the token contract address, which
  // the dashboard then hashed and sent to `dispatchOrder`/`refundOrder`, where
  // it failed with `OrderNotFound`. The id and token now resolve through the
  // shared topic maps, so a contract revision only changes one place.
  const topic = (position: number): string => fields[`topic${position}`] ?? "";

  let buyer = "";
  switch (symbol) {
    // topics: (pay, token, buyer, merchant, order_id)
    case "pay":
    // topics: (create_order, token, buyer, order_id)
    case "create_order":
      buyer = topic(2);
      break;
    // topics: (dispatch, order_id, merchant) - the event carries no buyer, so
    // `buyer` stays empty rather than reporting the merchant as the buyer.
    case "dispatch":
      break;
    // topics: (refund, order_id, buyer)
    case "refund":
      buyer = topic(2);
      break;
    default:
      break;
  }

  // A field emitted by the event's data map wins over the positional read, so
  // a layout that carries these values in `data` keeps working unchanged.
  const resolvedOrderId = eventOrderId(event);
  const resolvedBuyer = fields.buyer || buyer;
  const tokenTopic = EVENT_TOKEN_TOPIC[symbol];
  const resolvedToken = fields.token || (tokenTopic ? fields[tokenTopic] : "");

  const amountStr = fields.amount || "0";

  // Try to get token config
  const tokenConfig = tokenForContract(resolvedToken);
  const decimals = tokenConfig?.decimals ?? 7;
  const tokenSymbol = tokenConfig?.symbol ?? "TOKEN";

  // Parse amount
  let amountRaw = BigInt(0);
  try {
    amountRaw = BigInt(amountStr);
  } catch {
    // Keep as 0
  }

  const amountDisplay = (Number(amountRaw) / Math.pow(10, decimals)).toFixed(2);

  // Parse timestamp
  let timestamp = Date.now();
  if (fields.timestamp) {
    try {
      timestamp = parseInt(fields.timestamp) * 1000;
    } catch {
      // Keep current time
    }
  }

  return {
    orderId: resolvedOrderId,
    buyer: resolvedBuyer,
    amount: amountDisplay,
    amountRaw,
    token: resolvedToken,
    tokenSymbol,
    status,
    timestamp,
    ledger,
    txHash,
  };
}

/**
 * Merges an incoming OrderEvent into an existing OrderEvent.
 * When a newer lifecycle event (e.g. dispatch or refund) arrives for an existing order,
 * it updates lifecycle fields (status, ledger, txHash, timestamp) while preserving
 * the original payment and buyer fields (buyer, token, tokenSymbol, amount, amountRaw).
 */
export function mergeOrderEvents(existing: OrderEvent, incoming: OrderEvent): OrderEvent {
  // Only update if the incoming event is from a newer or equal ledger
  if (incoming.ledger < existing.ledger) {
    return existing;
  }

  return {
    ...existing,
    status: incoming.status !== "Unknown" ? incoming.status : existing.status,
    ledger: incoming.ledger,
    txHash: incoming.txHash || existing.txHash,
    timestamp: incoming.timestamp || existing.timestamp,
    buyer: existing.buyer || incoming.buyer,
    token: existing.token || incoming.token,
    tokenSymbol: existing.tokenSymbol || incoming.tokenSymbol,
    amount: existing.amount || incoming.amount,
    amountRaw: existing.amountRaw || incoming.amountRaw,
  };
}

/**
 * Singular alias of {@link mergeOrderEvents}.
 *
 * The function folds a single incoming event into a single existing row, so the
 * singular name describes it more accurately, and callers reach for either one.
 * Both names deliberately share one function reference, so
 * `mergeOrderEvent === mergeOrderEvents` holds.
 */
export const mergeOrderEvent = mergeOrderEvents;
