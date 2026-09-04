"use client";
import { useState, useEffect } from "react";

import Toast from "../../components/Toast";
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
import { SiKlarna } from "react-icons/si";
import sendMail from "../../lib/sendmail";
import { validateOTP } from "../../lib/validation";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";
import StellarWalletButton from "../../components/StellarWalletButton";
import StellarOrderWatch from "../../components/StellarOrderWatch";
import { SiStellar } from "react-icons/si";
import {
  validateEmail,
  validateName,
  validateAddress,
  validateCardNumber,
  validateCardExpiry,
  validateCardCVV,
} from "../../lib/validation";

const Checkout = () => {

  // OTP is stored as a zero-padded 6-digit string so it always matches the format
  // shown in the email (e.g. "000042") and can be compared with exact string
  // equality instead of a loose numeric parse.
  const [otp, setOtp] = useState<string>(() =>
    String(Math.floor(Math.random() * 1000000)).padStart(6, "0")
  );
  const [totalPrice, setTotalPrice] = useState(0);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [stage, setStage] = useState(1);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
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

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
  };

  const [orderId] = useState(() =>
    `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  );

  const handleStellarSuccess = (result: { amountUsd: number | string }) => {
    showToast(
      `USDC payment received ✓ $${Number(result.amountUsd).toFixed(2)} · order ${orderId}`
    );
    setStage(3);
    localStorage.clear();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredOtp(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEmptyCart) {
      showToast("Your cart is empty. Please add items before checking out.");
      return;
    }
    setIsSubmitting(true);
    try {
      await sendMail({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        message: `You are about to checkout your cart on Mova Store. Your OTP is: ${otp}`,
        recipientEmail: formData.email,
        subject: formData.subject,
      });

      setStage(2);
      showToast(
        "Form submitted successfully. OTP has been sent to your email."
      );
    } catch (error) {
      setIsSubmitting(false);
      showToast("Failed to send OTP. Please try again.");
    }
  };

  const handleEmailConfirmationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsOtpSending(true);
    // Validate the raw trimmed input as a 6-digit code, then compare it against the
    // zero-padded OTP with exact string equality. We deliberately compare the raw
    // input rather than validateOTP's sanitized value, because the validator strips
    // non-digits ("000042abc" -> "000042") and would otherwise let digits-followed-
    // by-junk through.
    const entered = enteredOtp.trim();
    const { isValid } = validateOTP(entered);
    if (isValid && entered === otp) {
      setStage(3);
      localStorage.clear();
      showToast("OTP confirmed successfully.");
    } else {
      setIsOtpSending(false);
      showToast("Incorrect OTP. Please try again.");
    }
  };

  const handleGoBack = () => {
    if (stage > 1) {
      setStage(stage - 1);
      setIsSubmitting(false)
    }
  };

  useEffect(() => {
    try {
      const storedItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
      const storedTotalPrice = localStorage.getItem("totalPrice");
      if (Array.isArray(storedItems)) {
        setCartItems(storedItems);
      }
      if (storedTotalPrice) {
        setTotalPrice(parseFloat(storedTotalPrice));
      }
    } catch {
      setCartItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const isEmptyCart = isLoaded && (cartItems.length === 0 || totalPrice <= 0);

  useEffect(() => {
    if (stage === 3) {
      localStorage.removeItem("totalPrice");
      localStorage.removeItem("itemCount");
      localStorage.removeItem("cartItems");
    }
  }, [stage]);

  if (isEmptyCart) {
    return (
      <div className="container mx-auto px-4 py-16 my-10 max-w-lg text-center bg-white rounded-lg shadow-md border-2 border-purple-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">
          Looks like you have not added any items to your cart yet. Please add items to proceed with checkout.
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
        <span
          className={`w-20 h-1 sm:w-96 ${
            stage >= 2 ? "bg-purple-700" : "bg-gray-200"
          }`}
        ></span>
        <span
          className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-purple-700 rounded-full ${
            stage >= 2 ? "bg-purple-700 text-white" : "bg-white"
          }`}
        >
          2
        </span>
        <span
          className={`w-20 h-1 sm:w-96 ${
            stage >= 3 ? "bg-purple-700" : "bg-gray-200"
          }`}
        ></span>
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
              <form
                onSubmit={handleSubmit}
                className="bg-white p-4 rounded shadow-md"
              >
                <h2 className="text-2xl mb-4 text-center">Checkout</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-gray-700">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">Card Number</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        type="text"
                        name="cardNumber"
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
                        }}
                        maxLength={19}
                        placeholder="16-digit card number"
                        required
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                      />
                      <FaCreditCard className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700">Expiry Date</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        type="text"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={(e) => {
                          let { value } = e.target;
                          value = value.replace(/[^0-9/]/g, "");
                          if (value.length === 2 && !value.includes("/") && formData.expiryDate.length === 1) {
                            value = value + "/";
                          }
                          if (value.length > 5) {
                            value = value.slice(0, 5);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            expiryDate: value,
                          }));
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                        required
                      />
                      <BsCalendarDate className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700">Cvv</label>
                    <div className="relative flex justify-center items-center">
                      <input
                        type="text"
                        name="cvv"
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
                        }}
                        placeholder="3 or 4 digits"
                        maxLength={4}
                        required
                        className="w-full sm:w-64 lg:w-full px-3 py-2 border rounded"
                      />
                      <FaCreditCard className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || isEmptyCart}
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
                    or pay with Stellar (USDC)
                  </span>
                  <span className="h-px flex-1 bg-gray-300" />
                </div>
                <StellarWalletButton />
                <StellarCheckoutButton
                  amountUsd={totalPrice}
                  orderId={orderId}
                  disabled={isSubmitting || totalPrice <= 0}
                  onSuccess={handleStellarSuccess}
                />
                <StellarOrderWatch orderId={orderId} enabled={stage === 1} />
                <p className="text-[11px] text-gray-400 text-center">
                  Order #{orderId} · USDC (testnet) is escrowed by a Soroban smart
                  contract until we ship, then released to our merchant wallet. Refunds
                  go straight back on-chain. No card needed.
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
                  <label className="block text-gray-700">
                    Please confirm OTP
                  </label>
                  <input
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
                <p className="text-center">
                  Your order has been placed successfully.
                </p>
                <span className="text-center">
                  Thanks for Shopping with us 🥰🥰🥰
                </span>
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
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
        time={4000}
      />
    </>
  );
};

export default Checkout;
