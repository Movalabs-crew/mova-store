use soroban_sdk::{contracttype, Address, BytesN, Env, IntoVal, TryFromVal, Val};

use crate::errors::Error;
use crate::order::Order;

/// TTL policy: keep order/merchant data alive well beyond typical testnet usage.
pub const LEDGER_THRESHOLD: u32 = 1000;
pub const LEDGER_TO_EXTEND_TO: u32 = 10_000;

#[contracttype]
pub enum DataKey {
    /// The merchant wallet that owns the contract and can dispatch/refund.
    Admin,
    /// An order registry entry, keyed by 32-byte order id.
    Order(BytesN<32>),
    /// Whether the given SEP-41 token contract is accepted by the merchant.
    TokenAllowed(Address),
}

/// The single write path for persistent contract state.
///
/// Every persistent entry the contract owns is written through here, so the TTL
/// extension happens next to the write instead of being repeated at each call
/// site. A new `DataKey` variant therefore cannot be persisted without picking
/// up the extension policy (#509).
fn persistent_set<V>(env: &Env, key: &DataKey, value: &V)
where
    V: IntoVal<Env, Val>,
{
    env.storage().persistent().set(key, value);
    extend_ttl(env, key);
}

/// The single read path for persistent contract state.
///
/// A hit extends the TTL, mirroring the write path, so state that is read
/// frequently (the admin, an order, a whitelisted token) does not age out
/// while it is in active use. A miss is returned as `None` without touching
/// the ledger, so probing an absent key never creates an entry.
fn persistent_get<V>(env: &Env, key: &DataKey) -> Option<V>
where
    V: TryFromVal<Env, Val>,
    V::Error: core::fmt::Debug,
{
    let value: Option<V> = env.storage().persistent().get(key);
    if value.is_some() {
        extend_ttl(env, key);
    }
    value
}

/// Extend the TTL of a persistent entry to [`LEDGER_TO_EXTEND_TO`] ledgers once
/// it drops below [`LEDGER_THRESHOLD`]. Private to this module: every persistent
/// read and write goes through [`persistent_set`] / [`persistent_get`], so no
/// call site has to remember to extend.
fn extend_ttl(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, LEDGER_THRESHOLD, LEDGER_TO_EXTEND_TO);
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Admin)
}

pub fn get_admin(env: &Env) -> Result<Address, Error> {
    persistent_get(env, &DataKey::Admin).ok_or(Error::NotInitialized)
}

pub fn set_admin(env: &Env, admin: &Address) {
    persistent_set(env, &DataKey::Admin, admin);
}

pub fn get_order(env: &Env, order_id: &BytesN<32>) -> Option<Order> {
    persistent_get(env, &DataKey::Order(order_id.clone()))
}

pub fn set_order(env: &Env, order_id: &BytesN<32>, order: &Order) {
    persistent_set(env, &DataKey::Order(order_id.clone()), order);
}

pub fn is_token_allowed(env: &Env, token: &Address) -> bool {
    // `persistent_get` extends only on a hit, so a token that was never added
    // still reads as `false` without creating an entry.
    persistent_get(env, &DataKey::TokenAllowed(token.clone())).unwrap_or(false)
}

pub fn set_token_allowed(env: &Env, token: &Address, allowed: bool) {
    let key = DataKey::TokenAllowed(token.clone());
    if allowed {
        // Whitelisting is long-lived deployment state: `add_token` is normally
        // called once at setup, so the entry must be extended or it keeps the
        // default persistent TTL and can eventually be archived — after which
        // every `create_order`/`pay` fails with `TokenNotAllowed` with no code
        // change (see #493).
        persistent_set(env, &key, &true);
    } else {
        // Removal stays a removal: an entry that was never added, or one that
        // has been revoked, must not be resurrected just to carry a TTL.
        env.storage().persistent().remove(&key);
    }
}
