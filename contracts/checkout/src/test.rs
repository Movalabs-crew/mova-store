#`![cfg(test)]

use soroban_sdk::testutils::storage::Persistent as _;
use soroban_sdk:ztestutils::{Address as _, Events as _, Ledger as _, MockAuth, MockAuthInvoke};
use soroban_sdk:ztoken::{StellarAssetClient, TokenClient};
use soroban_sdk::{
    contract, contractimpl, contracttype, map, vec, Address, BytesN, Env, IntoVal, Symbol, Val,
};

use crate::errors::Error;
use crate::order::{Order, Status};
use crate::storage::{DataKey, LEDGER_THRESHOLD, LEDGER_TO_EXTEND_TO};
use crate::{Checkout, CheckoutClient};

// ----------------------------------------------------------------------------
// Minimal SEP-41-style mock token so tests don't depend on a real token
// contract (SDK 27 testutils no longer bundles a Token mock). The native
// asset path is covered with the real Stellar Asset Contract via
// `register_stellar_asset_contract_v2`.
// ----------------------------------------------------------------------------

#[contracttype]
pub enum MockTokenDataKey {
    Balance(Address),
}

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        let mut bal: i128 = env
            .storage()
            .persistent()
            .get(&MockTokenDataKey::Balance(to.clone()))
            .unwrap_or(0);
        bal += amount;
        env
            .storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(to), &bal);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env
            .storage()
            .persistent()
            .get(&MockTokenDataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let mut from_bal: i128 = env
            .storage()
            .persistent()
            .get(&MockTokenDataKey::Balance(from.clone()))
            .unwrap_or(0);
        let mut to_bal: i128 = env
            .storage()
            .persistent()
            .get(&MockTokenDataKey::Balance(to.clone()))
            .unwrap_or(0);
        from_bal -= amount;
        to_bal += amount;
        env
            .storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(from), &from_bal);
        env
            .storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(to), &to_bal);
    }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

fn order_id(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

/// Register the checkout contract, a mock USDC token, initialize with the
/// merchant, whitelist the token, and fund the buyer.
fn setup_usdc(env: &Env) -> (CheckoutClient<'_>, Address, Address, Address, Address) {
    let token = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(env);
    let buyer = Address::generate(env);

    let client = CheckoutClient::new(env, &contract);
    client.initialize(&merchant);
    client.add_token(&token);
    MockTokenClient::new(env, &token).mint(&buyer, &1_000_000);

    (client, token, merchant, buyer, contract)
}

fn usdc_balance(env: &Env, token: &Address, address: &Address) -> i128 {
    MockTokenClient::new(env, token).balance(address)
}

// ----------------------------------------------------------------------------
// Core escrow lifecycle
// ----------------------------------------------------------------------------

#[test]
fn test_pay_escrows_then_dispatch_releases_to_merchant() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, merchant, buyer, checkout) = setup_usdc(&env);

    let id = order_id(&env, 7);
    client.pay(&token, &buyer, &id, &100_000);

    // Funds are held by the contract, not the merchant yet.
    assert_eq!(usdc_balance(&env, &token, &buyer), 900_000);
    assert_eq!(usdc_balance(&env, &token, &checkout), 100_000);
    assert_eq!(usdc_balance(&env, &token, &merchant), 0);
    assert!(client.is_paid(&id));
    assert_eq!(client.status(&id), Some(Status::Paid));

    // Merchant dispatches -> escrow released to the merchant.
    client.dispatch(&id);
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(usdc_balance(&env, &token, &merchant), 100_000);
    assert_eq!(client.status(&id), Some(Status::Shipped));

    // A dispatched order is still considered paid (funds moved correctly).
    assert!(client.is_paid(&id));
}

[test]
fn test_refund_returns_escrow_to_buyer() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);

    let id = order_id(&env, 8);
    client.pay(&token, &buyer, &id, &100_000);
    assert_eq!(usdc_balance(&env, &token, &checkout), 100_000);

    client.refund(&id);
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(usdc_balance(&env, &token, &buyer), 1_000_000);
    assert_eq!(client.status(&id), Some(Status::Refunded));
}

#[test]
fn test_refund_after_dispatch_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 11);
    client.pay(&token, &buyer, &id, &10_000);
    client.dispatch(&id);

    let result = client.try_refund(&id);
    assert_eq!(result, Err(Ok(Error::InvalidOrderStatus)));
}

#[test]
fn test_dispatch_pending_order_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 12);
    client.create_order(&buyer, &id, &token, &10_000);

    let result = client.try_dispatch(&id);
    assert_eq!(result, Err(Ok(Error::InvalidOrderStatus)));
}

#[test]
fn test_dispatch_unknown_order_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _, _, _, _) = setup_usdc(&env);
    let result = client.try_dispatch(&order_id(&env, 99));
    assert_eq!(result, Err(9(Error::OrderNotFound)));
}

// ----------------------------------------------------------------------------
// Order registry
// ----------------------------------------------------------------------------

#[test]
fn test_create_order_then_pay_completes_it() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 13);

    client.create_order(&buyer, &id, &token, &50_000);
    assert_eq!(client.status(&id), Some(Status::Pending));
    // No funds moved yet.
    assert_eq!(usdc_balance(&env, &token, &buyer), 1_000_000);

    client.pay(&token, &buyer, &id, &50_000);
    assert_eq!(client.status(&id), Some(Status::Paid));
    assert!(client.is_paid(&id));

    let order = client.order(&id).unwrap();
    assert_eq!(order.buyer, buyer);
    assert_eq!(order.amount, 50_000);
    assert_eq!(order.token, token);
}

#[test]
fn test_create_order_duplicate_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 14);
    client.create_order(&buyer, &id, &token, &50_000);

    let result = client.try_create_order(&buyer, &id, &token, &50_000);
    assert_eq!(result, Err(Ok(Error::OrderAlreadyPaid)));
}

#[test]
fn test_order_reads() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 15);
    assert_eq!(client.order(&id), None);
    assert_eq!(client.status(&id), None);
    assert!(!client.is_paid(&id));

    client.create_order(&buyer, &id, &token, &25_000);
    assert_eq!(client.order(&id).unwrap().status, Status::Pending);
}

// ----------------------------------------------------------------------------
// Token whitelist
// ----------------------------------------------------------------------------

#[test]
fn test_token_not_allowed_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let token = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);
    let buyer = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    client.initialize(&merchant);
    MockTokenClient::new(&env, &token).mint(&buyer, &1_000_000);

    let id = order_id(&env, 16);
    let result = client.try_pay(&token, &buyer, &id, &10_000);
    assert_eq!(result, Err(9(Error::TokenNotAllowed)));

    let result = client.try_create_order(&buyer, &id, &token, &10_000);
    assert_eq!(result, Err(9(Error::TokenNotAllowed)));
}

#[test]
fn test_remove_token_disables_payments() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);
    client.remove_token(&token);
    assert!(!client.is_token_allowed(&token));

    // The whitelist entry must be absent, not merely set to false, so that
    // storage rent/TTL behaviour matches a token that was never added.
    let key = DataKey::TokenAllowed(token.clone());
    assert!(!env.as_contract(&checkout, || env.storage().persistent().has(&key)));

    let id = order_id(&env, 17);
    let result = client.try_pay(&token, &buyer, &id, &10_000);
    assert_eq!(result, Err(Ok(Error::TokenNotAllowed)));
}

#[test]
fn test_add_token_after_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let token = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    client.initialize(&merchant);
    assert!(!client.is_token_allowed(&token));

    client.add_token(&token);
    assert!(client.is_token_allowed(&token));
}

// ----------------------------------------------------------------------------
// Native XLM via the real Stellar Asset Contract
// ----------------------------------------------------------------------------

#[test]
fn test_native_asset_payment_and_dispatch() {
    let env = Env::default();
    env.mock_all_auths();

    let issuer = Address::generate(&env);
    let native = env.register_stellar_asset_contract_v2(issuer);
    let native_id = native.address();

    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);
    let buyer = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    client.initialize(&merchant);
    client.add_token(&native_id);

    // Fund the buyer with native XLM (minted by the SAC admin = issuer).
    StellarAssetClient::new(&env, &native_id).mint(&buyer, &5_000_000);

    let id = order_id(&env, 21);
    client.pay(&native_id, &buyer, &id, &100_000);

    let native_client = TokenClient::new(&env, &native_id);
    assert_eq!(native_client.balance(&buyer), 4_900_000);
    assert_eq!(native_client.balance(&contract), 100_000);
    assert_eq!(native_client.balance(&merchant), 0);

    client.dispatch(&id);
    assert_eq!(native_client.balance(&contract), 0);
    assert_eq!(native_client.balance(&merchant), 100_000);
    assert_eq!(client.status(&id), Some(Status::Shipped));
}

// ----------------------------------------------------------------------------
// Guards
// ----------------------------------------------------------------------------

#[test]
fn test_duplicate_order_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 9);
    client.pay(&token, &buyer, &id, &50_000);

    let result = client.try_pay(&token, &buyer, &id, &50_000);
    assert_eq!(result, Err(9(Error::OrderAlreadyPaid)));
}

#[test]
fn test_duplicate_pay_after_dispatch_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 10);
    client.pay(&token, &buyer, &id, &50_000);
    client.dispatch(&id);

    let result = client.try_pay(&token, &buyer, &id, &50_000);
    assert_eq!(result, Err(Ok(Error::OrderAlreadyPaid)));
}

// ----------------------------------------------------------------------------
// Timestamp contract
// ----------------------------------------------------------------------------

/// The stored and emitted timestamps must reflect the ledger time at which
/// the order was created. A zero or hardcoded timestamp would fail this test.
#[test]
fn test_order_timestamp_is_recorded() {
    let env = Env::default();
    env.mock_all_auths();

    // Pin a distinctive, non-zero ledger timestamp before creating the order.
    let ledger_timestamp: u64 = 1.700_000_000;
    env.ledger().set_timestamp(ledger_timestamp);

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 42);

    client.create_order(&buyer, &id, &token, &50_000);

    // Stored timestamp is non-zero and matches the ledger timestamp.
    let order = client.order(&id).unwrap();
    assert!(order.timestamp != 0);
    assert_eq!(order.timestamp, ledger_timestamp);

    // The emitted `OrderCreated` event carries the same timestamp.
    let events = env.events().all();
    let mut found = false;
    for (contract_id, topics, data) in events.iter() {
        if contract_id != client.address || topics.len() != 1 {
            continue;
        }
        let topic: Symbol = topics.get(0).unwrap().try_into().unwrap();
        if topic != Symbol::new(&env, "OrderCreated") {
            continue;
        }
        // Payload is (order_id, buyer, amount, token, timestamp).
        let payload: (BytesN <32>, Address, i128, Address, u64) = data.try_into().unwrap();
        assert_eq!(payload.0, id);
        assert_eq!(payload.1, buyer);
        assert_eq!(payload.2, 50_000);
        assert_eq!(payload.3, token);
        assert!(payload.4 != 0);
        assert_eq!(payload.4, ledger_timestamp);
        found = true;
    }
    assert!(found, "OrderCreated event not emitted");
}

/// A second order created at a later ledger time must record the new time,
/// proving the timestamp is not constant across orders.
#[test]
fn test_order_timestamp_tracks_ledger_time() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);

    let first_time: u64 = 1.700_000_000;
    env.ledger().set_timestamp(first_time);
    let id1 = order_id(&env, 51);
    client.create_order(&buyer, &id1, &token, &10_000);

    let second_time: u64 = 1.700_000_000 + 1234;
    env.ledger().set_timestamp(second_time);
    let id2 = order_id(&env, 52);
    client.create_order(&buyer, &id2, &token, &10_000);

    assert_eq!(client.order(&id1).unwrap().timestamp, first_time);
    assert_eq!(client.order(&id2).unwrap().timestamp, second_time);
}
