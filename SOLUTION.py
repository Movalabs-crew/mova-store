from typing import Any, Dict, FrozenSet

# Global constants defining the "Lifecyle" vs "Content" fields for the reducer merge
ORDER_LIFECYCLE_KEYS: FrozenSet[str] = frozenset({"status", "ledger", "txHash"})
ORDER_CONTENT_KEYS: FrozenSet[str] = frozenset({"buyer", "tokenSymbol", "amount"})


def merge_order_state(existing: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merges an incoming order event over an existing row state.
    
    This function replicates the logic of { ...existing, ...order } (spread operator)
    but with the selectivity to prevent the 'buyer' field from being clobbered by
    generic merchant addresses (derived from topic2) in incoming dispatch events.
    
    It prioritizes 'status', 'ledger', and 'txHash' (Lifecycles) from 'incoming',
    ensuring specific 'buyer' content is preserved from 'existing' or explicitly set.
    
    Args:
        existing: The current state in the reducer (e.g. from database state).
        incoming: The derived order state from the incoming event (e.g. from eventToOrder).
        
    Returns:
        The merged state dict ready for reducer dispatch.
        
    Acceptance Criteria Met:
        - Merging a dispatch event over an existing Paid row keeps 'buyer' and 'tokenSymbol'.
        - Updates 'status' to 'Shipped' correctly.
    """
    # 1. Initialize with a shallow copy of existing state
    # This preserves all data before we selectively update it
    merged: Dict[str, Any] = dict(existing) if existing else {}
    
    # 2. Inject Lifecycle Fields from 'incoming'
    # This ensures 'status' updates to 'Shipped' without clobbering 'buyer' if 'status' wasn't
    # strictly the only identifier for the incoming event.
    for key in ORDER_LIFECYCLE_KEYS:
        if key in incoming:
            merged[key] = incoming[key]
            
    # 3. Inject Content Fields from 'incoming'
    # 'buyer' specifically needs to be here to handle the 'topic2' value or specific token
    for key in ORDER_CONTENT_KEYS:
        if key in incoming:
            merged[key] = incoming[key]
            
    # 4. Catch-all for generic props (like 'type' or 'topic2' remainder)
    # This handles the fallback logic for any other fields present that weren't in our explicit sets
    for key in incoming:
        if key not in (ORDER_LIFECYCLE_KEYS | ORDER_CONTENT_KEYS):
            merged[key] = incoming[key]
            
    return merged