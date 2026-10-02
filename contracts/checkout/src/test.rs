#![cfg(test)]

use soroban_sdk::testutils::storage::Persistent as _;
use soroban_sdk::testutils::{Address as _, Events, Ledger as _, MockAuth, MockAuthInvoke};
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{
    contract, contractimpl, contracttype, map, vec, Address, BytesN, Env, IntoVal, Symbol, Val,
};

use crate::errors::Error;
use crate::order::{Order, Status};
use crate::storage::{DataKey, LEDGER_THRESHOLD, LEDGER_TO_EXTEND_TO};
use crate::{Checkout, CheckoutClient};

// ---------------------------------------------------------------------------
// Minimal SEP-41-style mock token so tests don't depend on a real token
// contract (SDK 27 testutils no longer bundles a Token mock). The native
// asset path is covered with the real Stellar Asset Contract via
// `register_stellar_asset_contract_v2`.
// ---------------------------------------------------------------------------

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
        env.storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(to), &bal);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
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
        env.storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(from), &from_bal);
        env.storage()
            .persistent()
            .set(&MockTokenDataKey::Balance(to), &to_bal);
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Core escrow lifecycle
// ---------------------------------------------------------------------------

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

#[test]
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
    assert_eq!(result, Err(Ok(Error::OrderNotFound)));
}

// ---------------------------------------------------------------------------
// Order registry
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Token whitelist
// ---------------------------------------------------------------------------

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
    assert_eq!(result, Err(Ok(Error::TokenNotAllowed)));

    let result = client.try_create_order(&buyer, &id, &token, &10_000);
    assert_eq!(result, Err(Ok(Error::TokenNotAllowed)));
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

// ---------------------------------------------------------------------------
// Native XLM via the real Stellar Asset Contract
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

#[test]
fn test_duplicate_order_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 9);
    client.pay(&token, &buyer, &id, &50_000);

    let result = client.try_pay(&token, &buyer, &id, &50_000);
    assert_eq!(result, Err(Ok(Error::OrderAlreadyPaid)));
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

#[test]
fn test_pay_without_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let token = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let buyer = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    let id = order_id(&env, 1);

    // Uninitialized contracts have an empty token whitelist, so pay is rejected
    // before the NotInitialized admin check.
    let result = client.try_pay(&token, &buyer, &id, &1000);
    assert_eq!(result, Err(Ok(Error::TokenNotAllowed)));

    let result = client.try_dispatch(&id);
    assert_eq!(result, Err(Ok(Error::NotInitialized)));
}

#[test]
fn test_non_positive_amount_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);
    let id = order_id(&env, 2);

    let result = client.try_pay(&token, &buyer, &id, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    let result = client.try_create_order(&buyer, &id, &token, &-1);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_initialize_twice_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);
    let other = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    client.initialize(&merchant);

    let result = client.try_initialize(&other);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_set_merchant_changes_escrow_destination() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);
    let new_merchant = Address::generate(&env);
    client.set_merchant(&new_merchant);

    let id = order_id(&env, 3);
    client.pay(&token, &buyer, &id, &10_000);

    assert_eq!(usdc_balance(&env, &token, &new_merchant), 0);
    assert_eq!(usdc_balance(&env, &token, &checkout), 10_000);
    assert_eq!(client.merchant(), new_merchant);

    client.dispatch(&id);
    assert_eq!(usdc_balance(&env, &token, &new_merchant), 10_000);
}

#[test]
fn test_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, merchant, buyer, checkout) = setup_usdc(&env);
    let id = order_id(&env, 5);

    let timestamp: Val = env.ledger().timestamp().into_val(&env);
    let amount: Val = 10_000i128.into_val(&env);

    // The topic layout is a published interface, not an implementation detail:
    // lib/stellar/events.ts skips any event whose first topic is not `pay`, and
    // then reads topics[1..] positionally as [token, buyer, merchant,
    // order_id]. Asserting the whole lifecycle exactly means a change to either
    // the event name or the topic order fails here, rather than silently
    // stopping the indexer from ever seeing a payment. SDK 27 exposes events
    // from the latest invocation, so check each operation before the next call.
    client.create_order(&buyer, &id, &token, &10_000);
    assert_eq!(
        env.events().all().filter_by_contract(&checkout),
        vec![
            &env,
            (
                checkout.clone(),
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

    client.pay(&token, &buyer, &id, &10_000);
    assert_eq!(
        env.events().all().filter_by_contract(&checkout),
        vec![
            &env,
            (
                checkout.clone(),
                (
                    Symbol::new(&env, "pay"),
                    token.clone(),
                    buyer.clone(),
                    merchant.clone(),
                    id.clone(),
                )
                    .into_val(&env),
                map![&env, (Symbol::new(&env, "amount"), amount)].into_val(&env),
            ),
        ]
    );

    client.dispatch(&id);
    assert_eq!(
        env.events().all().filter_by_contract(&checkout),
        vec![
            &env,
            (
                checkout.clone(),
                (Symbol::new(&env, "dispatch"), id.clone(), merchant.clone()).into_val(&env),
                map![&env, (Symbol::new(&env, "amount"), amount)].into_val(&env),
            ),
        ]
    );

    // Refund is the last event of the lifecycle and publishes
    // `(refund, order_id, buyer)` with `{ amount }` data. It runs on a separate
    // order because a dispatched order can no longer be refunded, and it must be
    // asserted here: `lib/stellar/events.ts` and the indexer decode this exact
    // topic order, so a silent layout change would break refund reconciliation.
    let refund_id = order_id(&env, 6);
    client.pay(&token, &buyer, &refund_id, &10_000);
    client.refund(&refund_id);
    assert_eq!(
        env.events().all().filter_by_contract(&checkout),
        vec![
            &env,
            (
                checkout.clone(),
                (
                    Symbol::new(&env, "refund"),
                    refund_id.clone(),
                    buyer.clone(),
                )
                    .into_val(&env),
                map![&env, (Symbol::new(&env, "amount"), amount)].into_val(&env),
            ),
        ]
    );
}

// ---------------------------------------------------------------------------
// add_token authorization (#496)
// ---------------------------------------------------------------------------

#[test]
fn test_add_token_without_admin_auth_rejected() {
    let env = Env::default();

    let token = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);
    let client = CheckoutClient::new(&env, &contract);

    // Authorize only the merchant's `initialize` call.
    env.mock_auths(&[MockAuth {
        address: &merchant,
        invoke: &MockAuthInvoke {
            contract: &contract,
            fn_name: "initialize",
            args: (&merchant,).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.initialize(&merchant);

    // Drop all authorization: an unauthenticated caller cannot whitelist.
    env.set_auths(&[]);

    let result = client.try_add_token(&token);
    assert!(
        result.is_err(),
        "add_token must require the merchant's auth"
    );
    assert!(
        !client.is_token_allowed(&token),
        "a rejected add_token must not whitelist the token"
    );
}

// Escrow predicate (#494)
// ---------------------------------------------------------------------------

#[test]
fn test_is_escrowed_only_while_funds_are_held() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, _) = setup_usdc(&env);

    // Paid: the contract is holding the buyer's funds.
    let paid = order_id(&env, 31);
    client.pay(&token, &buyer, &paid, &10_000);
    let paid_order = client.order(&paid).unwrap();
    assert!(paid_order.is_escrowed(), "a paid order must be escrowed");

    // Shipped: the escrow has been released to the merchant.
    let shipped = order_id(&env, 32);
    client.pay(&token, &buyer, &shipped, &10_000);
    client.dispatch(&shipped);
    let shipped_order = client.order(&shipped).unwrap();
    assert!(
        !shipped_order.is_escrowed(),
        "a dispatched order is settled, not escrowed"
    );

    // Refunded: the escrow has been returned to the buyer.
    let refunded = order_id(&env, 33);
    client.pay(&token, &buyer, &refunded, &10_000);
    client.refund(&refunded);
    let refunded_order = client.order(&refunded).unwrap();
    assert!(
        !refunded_order.is_escrowed(),
        "a refunded order is settled, not escrowed"
    );

    // Pending: nothing has been escrowed yet.
    let pending = order_id(&env, 34);
    client.create_order(&buyer, &pending, &token, &10_000);
    let pending_order = client.order(&pending).unwrap();
    assert!(
        !pending_order.is_escrowed(),
        "a pending order must not be escrowed"
    );

    // is_paid and is_escrowed deliberately differ: Shipped has been paid but
    // is no longer held in escrow. Inverting either predicate fails here.
    assert!(paid_order.is_paid());
    assert!(shipped_order.is_paid());
    assert!(!shipped_order.is_escrowed());
}

// ---------------------------------------------------------------------------
// TTL management (#505)
// ---------------------------------------------------------------------------

/// Remaining TTL of a persistent key, read from the contract's own storage.
fn persistent_ttl(env: &Env, contract: &Address, key: &DataKey) -> u32 {
    env.as_contract(contract, || env.storage().persistent().get_ttl(key))
}

#[test]
fn test_order_ttl_is_extended_to_policy_target_on_write() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);
    let id = order_id(&env, 41);

    // create_order persists the order; the test env starts the entry at its
    // minimum persistent TTL.
    client.create_order(&buyer, &id, &token, &10_000);
    let initial = persistent_ttl(&env, &checkout, &DataKey::Order(id.clone()));
    assert!(initial > 0, "the order must carry a TTL after a write");

    // Move to the point where the remaining TTL is just below the refresh
    // threshold, so the next write must actually extend it.
    assert!(initial >= LEDGER_THRESHOLD);
    env.ledger()
        .set_sequence_number(initial - LEDGER_THRESHOLD + 1);

    // pay() persists the same order again. If set_order stopped calling
    // extend_ttl the TTL would stay below the policy target and this fails.
    client.pay(&token, &buyer, &id, &10_000);

    assert_eq!(
        persistent_ttl(&env, &checkout, &DataKey::Order(id)),
        LEDGER_TO_EXTEND_TO,
        "order TTL must be extended to the policy target on write"
    );
}

#[test]
fn test_admin_ttl_is_extended_to_policy_target_on_write() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _, _, _, checkout) = setup_usdc(&env);

    // initialize() stored the merchant under DataKey::Admin.
    let initial = persistent_ttl(&env, &checkout, &DataKey::Admin);
    assert!(
        initial > 0,
        "the admin entry must carry a TTL after a write"
    );

    assert!(initial >= LEDGER_THRESHOLD);
    env.ledger()
        .set_sequence_number(initial - LEDGER_THRESHOLD + 1);

    // set_merchant() rewrites DataKey::Admin, so set_admin must extend the TTL.
    let new_merchant = Address::generate(&env);
    client.set_merchant(&new_merchant);

    assert_eq!(
        persistent_ttl(&env, &checkout, &DataKey::Admin),
        LEDGER_TO_EXTEND_TO,
        "admin TTL must be extended to the policy target on write"
    );
}

#[test]
fn test_ttl_policy_threshold_is_below_extension_target() {
    // Guards the invariant the two tests above rely on: extend_ttl only fires
    // when the remaining TTL is below the threshold, so the threshold must be
    // strictly smaller than the extension target.
    //
    // Evaluated at compile time, so inverting the policy fails the build
    // rather than silently disabling TTL refresh.
    const { assert!(LEDGER_THRESHOLD < LEDGER_TO_EXTEND_TO) };
}

// ---------------------------------------------------------------------------
// Refunding twice (#499)
// ---------------------------------------------------------------------------

#[test]
fn test_refund_twice_rejected_and_balance_unchanged() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);
    let id = order_id(&env, 35);

    client.pay(&token, &buyer, &id, &10_000);
    client.refund(&id);

    assert_eq!(client.status(&id), Some(Status::Refunded));
    let buyer_balance_after_refund = usdc_balance(&env, &token, &buyer);
    assert_eq!(buyer_balance_after_refund, 1_000_000);
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);

    // A second refund is not a valid lifecycle transition.
    let result = client.try_refund(&id);
    assert_eq!(result, Err(Ok(Error::InvalidOrderStatus)));

    // The rejected attempt must not move funds or change the recorded status.
    assert_eq!(
        usdc_balance(&env, &token, &buyer),
        buyer_balance_after_refund
    );
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(client.status(&id), Some(Status::Refunded));
}

#[test]
fn test_order_storage_round_trip_preserves_every_field() {
    use crate::storage::{get_order, set_order};

    let env = Env::default();
    let contract = env.register(Checkout, ());
    let buyer = Address::generate(&env);
    let token = env.register(MockToken, ());
    let id = order_id(&env, 38);

    let order = Order {
        buyer: buyer.clone(),
        amount: 123_456,
        token: token.clone(),
        timestamp: 1_700_000_000,
        status: Status::Shipped,
    };

    env.as_contract(&contract, || {
        assert_eq!(
            get_order(&env, &id),
            None,
            "no order exists before the write"
        );

        set_order(&env, &id, &order);

        let loaded = get_order(&env, &id).expect("the written order must read back");
        assert_eq!(loaded, order, "the whole record must round-trip unchanged");
        assert_eq!(loaded.buyer, buyer);
        assert_eq!(loaded.amount, 123_456);
        assert_eq!(loaded.token, token);
        assert_eq!(loaded.timestamp, 1_700_000_000);
        assert_eq!(loaded.status, Status::Shipped);
    });
}

#[test]
fn test_dispatch_twice_releases_escrow_once() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, merchant, buyer, checkout) = setup_usdc(&env);
    let id = order_id(&env, 18);
    client.pay(&token, &buyer, &id, &100_000);

    // First dispatch releases the escrow to the merchant.
    client.dispatch(&id);
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(usdc_balance(&env, &token, &merchant), 100_000);
    assert_eq!(client.status(&id), Some(Status::Shipped));

    // A second dispatch must be rejected and must not move the escrow again.
    let result = client.try_dispatch(&id);
    assert_eq!(result, Err(Ok(Error::InvalidOrderStatus)));

    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(usdc_balance(&env, &token, &merchant), 100_000);
    assert_eq!(usdc_balance(&env, &token, &buyer), 900_000);
    assert_eq!(client.status(&id), Some(Status::Shipped));
}

#[test]
fn test_set_merchant_requires_admin_auth() {
    let env = Env::default();

    // Mock auths only to bring the contract up; setup is not the subject here.
    env.mock_all_auths();
    let (client, _, merchant, _, _) = setup_usdc(&env);

    // Clearing the mocked auths disables mocking, so the next call carries no
    // admin authorization and must be rejected.
    env.set_auths(&[]);

    let attacker = Address::generate(&env);
    let result = client.try_set_merchant(&attacker);
    assert!(result.is_err(), "unauthorized set_merchant must fail");

    // The escrow destination is unchanged after the rejected call.
    assert_eq!(client.merchant(), merchant);
}

#[test]
fn test_pay_with_a_different_token_than_create_order() {
    let env = Env::default();
    env.mock_all_auths();

    let token_a = env.register(MockToken, ());
    let token_b = env.register(MockToken, ());
    let contract = env.register(Checkout, ());
    let merchant = Address::generate(&env);
    let buyer = Address::generate(&env);

    let client = CheckoutClient::new(&env, &contract);
    client.initialize(&merchant);
    client.add_token(&token_a);
    client.add_token(&token_b);
    MockTokenClient::new(&env, &token_a).mint(&buyer, &1_000_000);
    MockTokenClient::new(&env, &token_b).mint(&buyer, &1_000_000);

    let id = order_id(&env, 32);
    client.create_order(&buyer, &id, &token_a, &50_000);
    assert_eq!(client.order(&id).unwrap().token, token_a);

    // `pay` is bound to the token `create_order` recorded, so paying with a
    // different one is rejected instead of overwriting the reservation.
    let result = client.try_pay(&token_b, &buyer, &id, &50_000);
    assert_eq!(result, Err(Ok(Error::OrderTokenMismatch)));

    let order = client.order(&id).unwrap();
    assert_eq!(order.token, token_a);
    assert_eq!(order.amount, 50_000);
    assert_eq!(order.status, Status::Pending);
    assert!(!client.is_paid(&id));

    // No funds moved in either token.
    assert_eq!(usdc_balance(&env, &token_a, &buyer), 1_000_000);
    assert_eq!(usdc_balance(&env, &token_a, &contract), 0);
    assert_eq!(usdc_balance(&env, &token_b, &buyer), 1_000_000);
    assert_eq!(usdc_balance(&env, &token_b, &contract), 0);
}

#[test]
fn test_status_and_is_paid_after_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _, buyer, checkout) = setup_usdc(&env);
    let id = order_id(&env, 33);

    client.pay(&token, &buyer, &id, &100_000);
    assert!(client.is_paid(&id));

    client.refund(&id);

    // Refunded is the boundary of `is_paid`: the escrow went back to the buyer,
    // so the order is no longer considered settled.
    assert_eq!(client.status(&id), Some(Status::Refunded));
    assert!(!client.is_paid(&id));
    assert_eq!(usdc_balance(&env, &token, &checkout), 0);
    assert_eq!(usdc_balance(&env, &token, &buyer), 1_000_000);
}

#[test]
fn test_read_paths_extend_ttl_without_a_write() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, merchant, buyer, contract) = setup_usdc(&env);
    let id = order_id(&env, 37);
    client.create_order(&buyer, &id, &token, &10_000);

    let admin_key = DataKey::Admin;
    let order_key = DataKey::Order(id.clone());

    // Normalise both entries to the contract's own ceiling, and keep the
    // instance alive, so the decay below does not depend on the host's
    // default entry TTLs.
    env.as_contract(&contract, || {
        let persistent = env.storage().persistent();
        persistent.extend_ttl(&admin_key, LEDGER_TO_EXTEND_TO, LEDGER_TO_EXTEND_TO);
        persistent.extend_ttl(&order_key, LEDGER_TO_EXTEND_TO, LEDGER_TO_EXTEND_TO);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_TO_EXTEND_TO, LEDGER_TO_EXTEND_TO);
    });

    // Age both entries until they sit below the contract's extend threshold.
    env.ledger().with_mut(|li| {
        li.sequence_number += LEDGER_TO_EXTEND_TO - LEDGER_THRESHOLD / 2;
    });

    let admin_before = persistent_ttl(&env, &contract, &admin_key);
    let order_before = persistent_ttl(&env, &contract, &order_key);
    assert!(
        admin_before < LEDGER_THRESHOLD,
        "admin TTL should have decayed below the threshold, got {admin_before}"
    );
    assert!(
        order_before < LEDGER_THRESHOLD,
        "order TTL should have decayed below the threshold, got {order_before}"
    );

    // A bare read of each entry keeps it alive with no intervening write.
    assert_eq!(client.merchant(), merchant);
    assert_eq!(client.order(&id).unwrap().amount, 10_000);

    let admin_after = persistent_ttl(&env, &contract, &admin_key);
    let order_after = persistent_ttl(&env, &contract, &order_key);
    assert!(
        admin_after > admin_before,
        "get_admin must extend the admin TTL on a read"
    );
    assert!(
        order_after > order_before,
        "get_order must extend the order TTL on a read"
    );
    assert_eq!(admin_after, LEDGER_TO_EXTEND_TO);
    assert_eq!(order_after, LEDGER_TO_EXTEND_TO);
}

#[test]
fn test_reads_on_uninitialized_contract() {
    let env = Env::default();
    env.mock_all_auths();

    let contract = env.register(Checkout, ());
    let client = CheckoutClient::new(&env, &contract);
    let id = order_id(&env, 31);

    // `merchant()` is the first call an operator makes after deploying, so it
    // must surface NotInitialized on a fresh contract instead of panicking or
    // handing back a default address.
    let result = client.try_merchant();
    assert_eq!(result, Err(Ok(Error::NotInitialized)));

    // The order-scoped reads document their empty state too.
    assert_eq!(client.order(&id), None);
    assert_eq!(client.status(&id), None);
    assert!(!client.is_paid(&id));
}

#[test]
fn test_pay_after_create_pending_rejects_second_buyer() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, token, _merchant, buyer, contract) = setup_usdc(&env);
    let other = Address::generate(&env);
    MockTokenClient::new(&env, &token).mint(&other, &1_000_000);

    let id = order_id(&env, 42);
    client.create_order(&buyer, &id, &token, &50_000);

    // A second party cannot take over another buyer's pending reservation.
    let result = client.try_pay(&token, &other, &id, &50_000);
    assert_eq!(result, Err(Ok(Error::OrderBuyerMismatch)));

    // The original buyer's reservation is untouched and no funds moved.
    assert_eq!(client.order(&id).unwrap().buyer, buyer);
    assert_eq!(client.status(&id), Some(Status::Pending));
    assert_eq!(usdc_balance(&env, &token, &buyer), 1_000_000);
    assert_eq!(usdc_balance(&env, &token, &other), 1_000_000);
    assert_eq!(usdc_balance(&env, &token, &contract), 0);
}
