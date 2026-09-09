path = r"C:\Users\someo\Documents\Codex\bounty_work\mova-new\lib\stellar\scval.ts"
with open(path, "r", encoding="utf-8") as fh:
    content = fh.read()
new_func = """
// ---------------------------------------------------------------------------
// Order ID Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an order ID to its 32-byte hash for contract operations.
 * - If orderId is a 64-character hex string, it is already hashed (from indexer events) -> return as-is
 * - Otherwise, it is a raw pre-image (e.g., SS-...) -> SHA-256 hash it
 */
export async function resolveOrderIdHash(orderId: string): Promise<Uint8Array> {
  // Check if already a 64-hex hash (from indexer events)
  if (/^[0-9a-fA-F]{64}$/.test(orderId)) {
    return hexToBytes(orderId);
  }
  // Hash the raw pre-image
  return hashOrderId(orderId);
}
"""
with open(path, "w", encoding="utf-8") as fh:
    fh.write(content.rstrip() + new_func)
print("done scval")
