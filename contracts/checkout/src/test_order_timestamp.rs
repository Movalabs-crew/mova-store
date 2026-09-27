//! Regression coverage for the order timestamp (issue #501).
//!
//! `Order.timestamp` is documented as the "Ledger timestamp of the last status
//! transition" and `OrderCreated` publishes the same value in its data payload,
//! but nothing pinned that value to the ledger clock: a change that stopped
//! writing it (or wrote a constant) would have passed the whole suite.
//!
//! These tests assert that `create_order` records the ledger timestamp at call
//! time, that the emitted `create_order` event carries the identical value, and
//! that every later lifecycle transition (`pay`, `dispatch`, `refund`) refreshes
//! the recorded timestamp.

#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Events, Ledger as _};
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{map, vec, Address, BytesN, Env, IntoVal, Symbol, Val};

use crate::order::Status;
use crate::{Checkout, CheckoutClient};

/// A fixed, clearly non-zero clock value so a zero/unset timestamp is obvious.
const T0: u64 = 1_700_000_000;
const HOUR: u64 = 3_600;

fn order_id(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

/// Move the test ledger clock to `timestamp`.
fn set_time(env: &Env, timestamp: u64) {
    env.ledger().with_mut(|ledger| ledger.timestamp = timestamp);
}

/// Register the checkout contract plus a real Stellar Asset Contract used as the
/// payment token, whitelist it, and fund the buyer.
fn setup(env: &Env) -> (CheckoutClient<'_>, Address, Address, Address, Address) {
    let issuer = Address::generate(env);
    let token = env.register_stellar_asset_contract_v2(issuer).address();
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(env);
    let buyer = Address::generate(env);

    let client = CheckoutClient::new(env, &contract);
    client.initialize(&merchant);
    client.add_token(&token);
    StellarAssetClient::new(env, &token).mint(&buyer, &1_000_000);

    (client, token, merchant, buyer, contract)
}

#[test]
fn create_order_records_the_ledger_timestamp() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 31);
    client.create_order(&buyer, &id, &token, &50_000);

    let order = client.order(&id).unwrap();
    assert_eq!(order.status, Status::Pending);
    assert_ne!(order.timestamp, 0, "create_order must record a timestamp");
    assert_eq!(order.timestamp, T0);
    // The recorded value is the ledger clock, not the wall clock.
    assert_eq!(order.timestamp, env.ledger().timestamp());
}

#[test]
fn order_created_event_carries_the_recorded_timestamp() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, contract) = setup(&env);
    let id = order_id(&env, 32);
    let amount: Val = 50_000i128.into_val(&env);
    let timestamp: Val = T0.into_val(&env);

    client.create_order(&buyer, &id, &token, &50_000);

    // SDK 27 exposes events only for the latest invocation, so this must be the
    // first thing asserted after `create_order` — any later contract read clears
    // the buffer.
    assert_eq!(
        env.events().all().filter_by_contract(&contract),
        vec![
            &env,
            (
                contract.clone(),
                (
                    Symbol::new(&env, "create_order"),
                    token.clone(),
                    buyer.clone(),
                    id.clone(),
                )
                    .into_val(&env),
                map![
                    &env,
                    (Symbol::new(&env, "amount"), amount),
                    (Symbol::new(&env, "timestamp"), timestamp),
                ]
                .into_val(&env),
            ),
        ]
    );

    // Storage and event must agree, otherwise indexers and on-chain readers
    // disagree about when the order was created.
    assert_eq!(client.order(&id).unwrap().timestamp, T0);
}

#[test]
fn orders_created_at_different_times_keep_their_own_timestamp() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let first = order_id(&env, 33);
    client.create_order(&buyer, &first, &token, &10_000);
    assert_eq!(client.order(&first).unwrap().timestamp, T0);

    set_time(&env, T0 + 2 * HOUR);
    let second = order_id(&env, 34);
    client.create_order(&buyer, &second, &token, &10_000);

    assert_eq!(client.order(&first).unwrap().timestamp, T0);
    assert_eq!(client.order(&second).unwrap().timestamp, T0 + 2 * HOUR);
}

#[test]
fn pay_refreshes_the_timestamp_to_the_payment_time() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 35);
    client.create_order(&buyer, &id, &token, &50_000);
    assert_eq!(client.order(&id).unwrap().timestamp, T0);

    set_time(&env, T0 + HOUR);
    client.pay(&token, &buyer, &id, &50_000);

    let order = client.order(&id).unwrap();
    assert_eq!(order.status, Status::Paid);
    assert_eq!(order.timestamp, T0 + HOUR);
}

#[test]
fn dispatch_refreshes_the_timestamp_to_the_dispatch_time() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 36);
    client.create_order(&buyer, &id, &token, &50_000);

    set_time(&env, T0 + HOUR);
    client.pay(&token, &buyer, &id, &50_000);

    set_time(&env, T0 + 2 * HOUR);
    client.dispatch(&id);

    let order = client.order(&id).unwrap();
    assert_eq!(order.status, Status::Shipped);
    assert_eq!(order.timestamp, T0 + 2 * HOUR);
}

#[test]
fn refund_refreshes_the_timestamp_to_the_refund_time() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 37);
    client.create_order(&buyer, &id, &token, &50_000);

    set_time(&env, T0 + HOUR);
    client.pay(&token, &buyer, &id, &50_000);

    set_time(&env, T0 + 3 * HOUR);
    client.refund(&id);

    let order = client.order(&id).unwrap();
    assert_eq!(order.status, Status::Refunded);
    assert_eq!(order.timestamp, T0 + 3 * HOUR);
}

#[test]
fn lifecycle_timestamps_never_move_backwards() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 38);
    client.create_order(&buyer, &id, &token, &50_000);
    let created_at = client.order(&id).unwrap().timestamp;

    set_time(&env, T0 + HOUR);
    client.pay(&token, &buyer, &id, &50_000);
    let paid_at = client.order(&id).unwrap().timestamp;

    set_time(&env, T0 + 2 * HOUR);
    client.dispatch(&id);
    let dispatched_at = client.order(&id).unwrap().timestamp;

    assert!(created_at < paid_at, "pay must advance the timestamp");
    assert!(
        paid_at < dispatched_at,
        "dispatch must advance the timestamp"
    );
}

#[test]
fn order_without_transitions_keeps_its_creation_timestamp() {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, T0);

    let (client, token, _, buyer, _) = setup(&env);
    let id = order_id(&env, 39);
    client.create_order(&buyer, &id, &token, &50_000);
    let created_at = client.order(&id).unwrap().timestamp;

    // Reading the order later must not rewrite the timestamp.
    set_time(&env, T0 + 24 * HOUR);
    assert_eq!(client.order(&id).unwrap().timestamp, created_at);
}
