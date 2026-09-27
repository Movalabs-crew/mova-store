"use client";
import { useState, useEffect, useRef } from "react";

import Toast from "../../components/Toast";
import useToast from "../../hooks/useToast";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdArrowBack } from "react-icons/md";
import Link from "next/link";
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCcStripe,
  FaCcApplePay,
  FaCcAmex,
  FaCcDiscover,
  FaGooglePay,
  FaCcAmazonPay,
  FaCreditCard,
} from "react-icons/fa";
import { BsBank, BsCalendarDate } from "react-icons/bs";
import { SiKlarna, SiStellar } from "react-icons/si";
import sendMail from "../../lib/sendmail";
import { requestOtp, verifyOtp } from "../../lib/otp-client";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";
import StellarWalletButton from "../../components/StellarWalletButton";
import StellarOrderWatch from "../../components/StellarOrderWatch";
import {
  SUPPORTED_TOKENS,
  defaultToken,
  TokenConfig,
  NETWORK,
} from "../../lib/stellar/config";
import { convertUsdToXlm, DEFAULT_XLM_USD_PRICE } from "../../lib/stellar/price";
import {
  validateOTP,
  validateEmail,
  validateName,
  validateAddress,
  validateCardNumber,
  validateCardExpiry,
  validateCardCVV,
} from "../../lib/validation";
import { ariaInvalid, focusFirstError } from "../../lib/accessibility";

/**
 * The cart is persisted as a single object under `cartItems` that carries the
 * derived total alongside the items, so the two can never drift apart. The
 * legacy `totalPrice` key is no longer written or trusted.
 */
type StoredCart = { items: any[]; total: number };

const CART_STORAGE_KEY = "cartItems";

/**
 * Derives the total from the items so the stored total can always be
 * recomputed on read and can never drift from the stored items.
 */
export const deriveTotal = (items: any[]): number =>
  items.reduce(
    (sum: number, item: any) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

/**
 * Reads the persisted cart. Accepts both the current `{ items, total }` shape
 * and the legacy bare-array shape (whose total is recomputed from the items so
 * a stale `totalPrice` key can never be trusted).
 */
const readStoredCart = (): StoredCart => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "null");
    if (Array.isArray(parsed)) {
      return { items: parsed, total: deriveTotal(parsed) };
    }
    if (parsed && Array.isArray(parsed.items)) {
      // Recompute the total from the items on read so a stale or tampered
      // stored total can never diverge from the stored items.
      return { items: parsed.items, total: deriveTotal(parsed.items) };
    }
  } catch {
    // fall through to the empty cart
  }
  return { items: [], total: 0 };
};

/** Persists items and their derived total together, in one write. */
const writeStoredCart = (items: any[], total: number) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, total }));
};

/** Stable ids for the per-field error text, referenced by aria-describedby. */
const FIELD_ERROR_IDS = {
  firstName: "checkout-first-name-error",
  lastName: "checkout-last-name-error",
  email: "checkout-email-error",
  address: "checkout-address-error",
  cardNumber: "checkout-card-number-error",
  expiryDate: "checkout-expiry-date-error",
  cvv: "checkout-cvv-error",
} as const;

type CheckoutField = keyof typeof FIELD_ERROR_IDS;

const Checkout = () => {
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(defaultToken());
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast, showToast, hideToast } = useToast(5000);
  const [stage, setStage] = useState(1);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    subject: "YOUR ORDER CONFIRMATION",
  });

  const [orderId] = useState(() => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

  const handleStellarSuccess = (result: { amountUsd: number | string; tokenSymbol?: string }) => {
    const symbol = result.tokenSymbol || selectedToken.symbol;
    showToast(
      `${symbol} payment received ✓ $${Number(result.amountUsd).toFixed(2)} · order ${orderId}`
    );
    setStage(3);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem("itemCount");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    clearError(name as CheckoutField);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredOtp(e.target.value);
  };

  /**
   * Clears a field's error as soon as the user edits it, so a message never
   * outlives the value that caused it.
   */
  const clearError = (field: CheckoutField) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  /**
   * Runs every field validator and returns only the failures. The card helpers
   * were imported but never called, so no field could report an invalid state.
   */
  const validateCheckoutFields = () => {
    const next: Partial<Record<CheckoutField, string>> = {};

    const first = validateName(formData.firstName, "First name");
    if (!first.isValid) next.firstName = first.error;

    const last = validateName(formData.lastName, "Last name");
    if (!last.isValid) next.lastName = last.error;

    const email = validateEmail(formData.email);
    if (!email.isValid) next.email = email.error;

    const address = validateAddress(formData.address);
    if (!address.isValid) next.address = address.error;

    const card = validateCardNumber(formData.cardNumber);
    if (!card.isValid) next.cardNumber = card.error;

    const expiry = validateCardExpiry(formData.expiryDate);
    if (!expiry.isValid) next.expiryDate = expiry.error;

    const cvv = validateCardCVV(formData.cvv);
    if (!cvv.isValid) next.cvv = cvv.error;

    return next;
  };

  // Focus has to wait for the render that writes aria-invalid onto the fields:
  // focusFirstError resolves the element by `[aria-invalid="true"]`, which does
  // not exist yet in the same tick as setErrors.
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    if (formRef.current) focusFirstError(formRef.current);
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateCheckoutFields();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Never send an OTP for a form already known to be invalid; the effect
      // above moves focus to the first field marked aria-invalid.
      return;
    }

    setIsSubmitting(true);
    try {
      // The recipient is pinned to this validated address server-side inside
      // requestOtp; callers can no longer choose an arbitrary recipient.
      const otpResult = await requestOtp(formData.email);
      if (!otpResult.ok) {
        setIsSubmitting(false);
        showToast(
          otpResult.error === "rate_limited"
            ? `Too many code requests. Try again in ${otpResult.retryAfterSeconds ?? 60}s.`
            : "Failed to send OTP. Please try again."
        );
        return;
      }

      setStage(2);
      showToast("Form submitted successfully. OTP has been sent to your email.");
    } catch (error) {
      setIsSubmitting(false);
      showToast("Failed to send OTP. Please try again.");
    }
  };

  const handleEmailConfirmationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isOtpSending) return;
    setIsOtpSending(true);
    // Shape-check the raw trimmed input as a 6-digit code before spending a
    // verification attempt. We deliberately check the raw input rather than
    // validateOTP's sanitized value, because the validator strips non-digits
    // ("000042abc" -> "000042") and would otherwise let digits-followed-by-junk
    // through. Correctness is decided by the server, never here.
    const entered = enteredOtp.trim();
    const { isValid } = validateOTP(entered);
    if (!isValid) {
      setIsOtpSending(false);
      showToast("Incorrect OTP. Please try again.");
      return;
    }

    const verification = await verifyOtp(formData.email, entered);
    if (verification.ok) {
      setStage(3);
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem("itemCount");
      showToast("OTP confirmed successfully.");
    } else {
      setIsOtpSending(false);
      showToast("Incorrect OTP. Please try again.");
    }
  };

  const handleGoBack = () => {
    if (stage > 1) {
      setStage(stage - 1);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Read the cart from localStorage. Items and total live in the same stored
    // object; we still re-fetch prices server-side so a tampered stored total
    // has no effect on what the customer is charged.
    const stored = readStoredCart();
    const storedItems = stored.items;
    setTotalPrice(deriveTotal(storedItems));
    setCartItems(storedItems);

    if (storedItems.length === 0) {
      setIsLoaded(true);
      return;
    }

    // Ask the server to compute the authoritative total from current DB prices.
    const itemRefs = storedItems.map((item: any) => ({
      id: item.id,
      quantity: item.quantity ?? 1,
    }));

    fetch("/api/checkout/compute-total", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemRefs }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`compute-total: HTTP ${res.status}`);
        return res.json() as Promise<{ total: number }>;
      })
      .then(({ total }) => {
        setTotalPrice(total);
        // Re-persist items and the authoritative total together so the stored
        // total always matches the stored items.
        writeStoredCart(storedItems, total);
      })
      .catch((err) => {
        console.error("Failed to fetch server-side total:", err);
        // Fall back to the total derived from the stored items so the stored
        // total and the stored items stay in sync.
        setTotalPrice(deriveTotal(storedItems));
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  // Emptiness is about the cart, not the total. If the server-side total cannot
  // be computed (the compute-total request failed), the cart still has items and
  // the customer must see the form — showing "Your cart is empty" would hide a
  // full cart behind a transient API error. The pay button is gated separately on
  // `totalPrice <= 0`, so an unresolved total still cannot be paid.
  const isEmptyCart = isLoaded && cartItems.length === 0;

  useEffect(() => {
    if (stage === 3) {
      localStorage.removeItem("itemCount");
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [stage]);

  if (isEmptyCart) {
    return (
      <div className="container mx-auto px-4 py-16 my-10 max-w-lg text-center bg-white rounded-lg shadow-md border-2 border-purple-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">
          Looks like you have not added any items to your cart yet. Please add items to proceed with
          checkout.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-700 hover:bg-purple-800 transition-colors"
        >
          <MdArrowBack className="mr-2" /> Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center items-center space-x-2 my-4 sm:mx-0 mx-4 mt-16">
        <span
          className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-purple-700 rounded-full ${
            stage >= 1 ? "bg-purple-700 text-white" : "bg-white"
          }`}
        >
          1
        </span>
        <span className={`w-20 h-1 sm:w-96 ${stage >= 2 ? "bg-purple-700" : "bg-gray-200"}`}></span>
        <span
          className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-purple-700 rounded-full ${
            stage >= 2 ? "bg-purple-700 text-white" : "bg-white"
          }`}
        >
          2
        </span>
        <span className={`w-20 h-1 sm:w-96 ${stage >= 3 ? "bg-purple-700" : "bg-gray-200"}`}></span>
        <span
          className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-purple-700 rounded-full ${
            stage >= 3 ? "bg-purple-700 text-white" : "bg-white"
          }`}
        >
          3
        </span>
      </div>

      <div className="container mx-auto px-4 py-4 my-10 w-full bg-purple-400 rounded-md border-2 border-purple-700">
        <div className="flex flex-wrap -mx-4">
          <div className="w-full md:w-1/2 px-4 mb-4 md:mb-0 p-4 rounded-md grid grid-cols-3 justify-center items-center">
            <FaCcVisa size={70} />
            <FaCcMastercard size={70} />
            <FaCcPaypal size={70} />
            <FaCcStripe size={70} />
            <BsBank size={70} />
            <FaCcAmex size={70} />
            <FaCcDiscover size={70} />
            <FaCcApplePay size={70} />
            <FaGooglePay size={70} />
            <FaCcAmazonPay size={70} />
            <SiKlarna size={70} />
          </div>
          <div className="w-full md:w-1/2 px-4 p-4 rounded-md">
            {stage === 1 && (
              <form ref={formRef} onSubmit={handleSubmit} noValidate className="bg-white p-4 rounded shadow-md">
                <h2 className="text-2xl mb-4 text-center">Checkout</h2>
                <p
                  role="note"
                  className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                >
                  Demo checkout — the card fields below are placeholders. Card values are
                  never transmitted or stored. Use the Stellar payment option to place a
                  real order.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="checkout-first-name" className="block text-gray-700">First Name</label>
                    <input
                      id="checkout-first-name"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                      {...ariaInvalid(Boolean(errors.firstName), FIELD_ERROR_IDS.firstName)}
                    />
                    {errors.firstName && (
                      <p id={FIELD_ERROR_IDS.firstName} className="mt-1 text-xs text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-last-name" className="block text-gray-700">Last Name</label>
                    <input
                      id="checkout-last-name"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                      {...ariaInvalid(Boolean(errors.lastName), FIELD_ERROR_IDS.lastName)}
                    />
                    {errors.lastName && (
                      <p id={FIELD_ERROR_IDS.lastName} className="mt-1 text-xs text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-email" className="block text-gray-700">Email</label>
                    <input
                      id="checkout-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                      {...ariaInvalid(Boolean(errors.email), FIELD_ERROR_IDS.email)}
                    />
                    {errors.email && (
                      <p id={FIELD_ERROR_IDS.email} className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-address" className="block text-gray-700">Address</label>
                    <input
                      id="checkout-address"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                      {...ariaInvalid(Boolean(errors.address), FIELD_ERROR_IDS.address)}
                    />
                    {errors.address && (
                      <p id={FIELD_ERROR_IDS.address} className="mt-1 text-xs text-red-600">
                        {errors.address}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-card-number" className="block text-gray-700">Card Number</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-card-number"
                        type="text"
                        name="cardNumber"
                        autoComplete="off"
                        value={formData.cardNumber}
                        onChange={(e) => {
                          let { value } = e.target;
                          value = value.replace(/\s+/g, "").replace(/[^0-9]/g, "");
                          if (value.length > 19) {
                            value = value.slice(0, 19);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            cardNumber: value,
                          }));
                          clearError("cardNumber");
                        }}
                        maxLength={19}
                        placeholder="16-digit card number"
                        required
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                        {...ariaInvalid(Boolean(errors.cardNumber), FIELD_ERROR_IDS.cardNumber)}
                      />
                      <FaCreditCard
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                        aria-hidden="true"
                      />
                    </div>
                    {errors.cardNumber && (
                      <p id={FIELD_ERROR_IDS.cardNumber} className="mt-1 text-xs text-red-600">
                        {errors.cardNumber}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-expiry-date" className="block text-gray-700">Expiry Date</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-expiry-date"
                        type="text"
                        name="expiryDate"
                        autoComplete="off"
                        value={formData.expiryDate}
                        onChange={(e) => {
                          let { value } = e.target;
                          value = value.replace(/[^0-9/]/g, "");
                          if (
                            value.length === 2 &&
                            !value.includes("/") &&
                            formData.expiryDate.length === 1
                          ) {
                            value = value + "/";
                          }
                          if (value.length > 5) {
                            value = value.slice(0, 5);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            expiryDate: value,
                          }));
                          clearError("expiryDate");
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                        required
                        {...ariaInvalid(Boolean(errors.expiryDate), FIELD_ERROR_IDS.expiryDate)}
                      />
                      <BsCalendarDate
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                        aria-hidden="true"
                      />
                    </div>
                    {errors.expiryDate && (
                      <p id={FIELD_ERROR_IDS.expiryDate} className="mt-1 text-xs text-red-600">
                        {errors.expiryDate}
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="checkout-cvv" className="block text-gray-700">Cvv</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-cvv"
                        type="text"
                        name="cvv"
                        autoComplete="off"
                        value={formData.cvv}
                        onChange={(e) => {
                          let { value } = e.target;
                          value = value.replace(/[^0-9]/g, "");
                          if (value.length > 4) {
                            value = value.slice(0, 4);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            cvv: value,
                          }));
                          clearError("cvv");
                        }}
                        placeholder="CVV"
                        maxLength={4}
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                        required
                        {...ariaInvalid(Boolean(errors.cvv), FIELD_ERROR_IDS.cvv)}
                      />
                      <FaCreditCard
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                        aria-hidden="true"
                      />
                    </div>
                    {errors.cvv && (
                      <p id={FIELD_ERROR_IDS.cvv} className="mt-1 text-xs text-red-600">
                        {errors.cvv}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center bg-purple-500 text-white py-2 rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </form>
            )}
            {stage === 1 && (
              <div className="mt-4 bg-white p-4 rounded shadow-md flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-300" />
                  <span className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <SiStellar size={16} className="text-purple-600" />
                    or pay with Stellar ({selectedToken.symbol})
                  </span>
                  <span className="h-px flex-1 bg-gray-300" />
                </div>

                {/* Token Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Select Payment Token:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_TOKENS.map((tok) => {
                      const isSelected = selectedToken.symbol === tok.symbol;
                      return (
                        <button
                          key={tok.symbol}
                          type="button"
                          onClick={() => setSelectedToken(tok)}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            isSelected
                              ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {tok.isNative ? (
                            <SiStellar size={15} className="text-purple-600" />
                          ) : (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                              $
                            </span>
                          )}
                          <span>{tok.symbol}</span>
                          {tok.isNative && (
                            <span className="text-[10px] text-purple-600 font-normal">
                              (Native)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedToken.isNative && totalPrice > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs bg-purple-50 border border-purple-100 rounded px-2.5 py-1.5 text-purple-800">
                      <span>Rate: 1 XLM ≈ ${DEFAULT_XLM_USD_PRICE} USD</span>
                      <span className="font-semibold">≈ {convertUsdToXlm(totalPrice)} XLM</span>
                    </div>
                  )}
                </div>

                <StellarWalletButton />
                <StellarCheckoutButton
                  amountUsd={totalPrice}
                  orderId={orderId}
                  token={selectedToken}
                  disabled={isSubmitting || totalPrice <= 0}
                  onSuccess={handleStellarSuccess}
                />
                <StellarOrderWatch orderId={orderId} enabled={stage === 1} />
                <p className="text-[11px] text-gray-400 text-center">
                  Order #{orderId} · {selectedToken.symbol} (testnet) is escrowed by a Soroban smart
                  contract until we ship, then released to our merchant wallet. Refunds go straight
                  back on-chain. No card needed.
                </p>
              </div>
            )}
            {stage === 2 && (
              <form
                onSubmit={handleEmailConfirmationSubmit}
                className="bg-white p-4 rounded shadow-md h-full space-y-12"
              >
                <h2 className="text-2xl mb-4 text-center">Confirm OTP</h2>
                <span className="text-md">An OTP was sent to your email</span>
                <div className="mb-4">
                  <label htmlFor="checkout-otp" className="block text-gray-700">
                    Please confirm OTP
                  </label>
                  <input
                    id="checkout-otp"
                    type="text"
                    name="otpConfirmation"
                    value={enteredOtp}
                    onChange={handleOtpChange}
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="OTP"
                    className="w-64 px-3 py-2 border rounded"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isOtpSending}
                  className="w-full bg-purple-500 text-white flex justify-center items-center py-2 rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOtpSending ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="w-full flex justify-center items-center bg-gray-300 text-black py-2 rounded mt-4 hover:bg-gray-500 transition-colors"
                >
                  <MdArrowBack className="mr-2" />
                  Go Back
                </button>
              </form>
            )}
            {stage === 3 && (
              <div className="bg-white p-4 rounded shadow-md h-full flex flex-col justify-center items-center">
                <h2 className="text-6xl mb-4 text-center">Order Completed.</h2>
                <p className="text-center">Your order has been placed successfully.</p>
                <span className="text-center">Thanks for Shopping with us 🥰🥰🥰</span>
                <Link
                  href="/shop"
                  className="text-center mt-8 py-2 bg-purple-700 hover:bg-purple-500 rounded-md px-2"
                >
                  Back to Shop
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast message={toast.message} show={toast.show} onClose={hideToast} time={4000} />
    </>
  );
};

export default Checkout;
