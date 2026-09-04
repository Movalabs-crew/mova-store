import Toast from "../../components/Toast";
import { useState } from "react";
import { validateEmail } from "../../lib/validation";
import { useToast } from "@/hooks/useToast";

export default function Newsletter() {
  const { toast, showToast, hideToast } = useToast(5000);
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || email.trim().length === 0) {
      showToast("Please enter your email!");
      return;
    }

    const validation = validateEmail(email);
    if (!validation.isValid) {
      showToast(validation.error || "Please enter a valid email address");
      return;
    }

    showToast("Thank you for subscribing!");
    setEmail("");
    e.target.reset();
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
            value={email}
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
            placeholder="Enter your email"
            aria-label="Email"
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
        time={5000}
        onClose={hideToast}
      />
    </div>
  );
}
