import Toast from "../../components/Toast";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Newsletter() {
  const [toast, setToast] = useState({ show: false, message: "" });
  const [email, setEmail] = useState("");
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = email;
    // Clear state *and* the form so a stale email can never be
    // reused by the next submission.
    setEmail("");
    e.target.reset();
    if (value && EMAIL_RE.test(value)) {
      showToast("Thank you for subscribing!");
    } else {
      showToast("Please enter a valid email!");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-white py-16 px-4 sm:px-0">
      <h2 className="font-bold text-3xl sm:text-4xl mb-3 text-center text-gray-900">
        Stay in the Loop
      </h2>
      <p className="text-lg sm:text-xl text-gray-600 mb-8 text-center max-w-xl">
        New shoe drops, Stellar integration updates, and insights on crypto
        commerce — straight to your inbox. No spam, unsubscribe anytime.
      </p>
      <form
        className="w-full max-w-md"
        onSubmit={handleSubmit}
        noValidate={true}
      >
        <div className="flex items-center border-b border-purple-700 py-2">
          <input
            type="email"
            name="email"
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
            placeholder="Enter your email"
            aria-label="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          />
          <button
            type="submit"
            className="flex-shrink-0 bg-purple-700 hover:bg-purple-600 border-purple-700 hover:border-purple-600 text-sm border-4 text-white py-1 px-2"
          >
            Subscribe
          </button>
        </div>
      </form>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </div>
  );
}
