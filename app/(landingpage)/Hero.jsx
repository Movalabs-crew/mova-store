"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import Toast from "../../components/Toast";
import Link from "next/link";

export default function Hero() {
  const { user } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
  };

  const handleProtectedLinkClick = (e, path) => {
    if (!user) {
      e.preventDefault();
      showToast("Kindly login first");
      router.push("/profile/login");
    } else {
      e.preventDefault();
      router.push(path);
    }
  };

  return (
    <>
      <section className="bg-custom-image bg-cover bg-center h-screen relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/60" />
        <div className="relative flex flex-col items-center justify-center h-full px-6 text-center">
          <p className="text-sm uppercase tracking-widest text-red-300 mb-4">
            Curated footwear · Card or crypto checkout
          </p>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white">
            Walk Taller. Pay Smarter.
          </h1>
          <p className="text-lg sm:text-xl text-white mt-6 max-w-2xl">
            Hand-picked sneakers, boots, heels and everyday staples — with
            honest pricing and a checkout that takes cards or USDC on Stellar.
          </p>
          <div className="flex gap-6 mt-10">
            <Link
              className="bg-red-700 hover:bg-red-600 text-white rounded-md px-6 py-3"
              href={user ? "/shop" : "#"}
              onClick={(e) => handleProtectedLinkClick(e, "/shop")}
            >
              Shop Now
            </Link>
            <Link
              href={user ? "/collections" : "#"}
              className="border border-white/70 hover:bg-red-600 hover:border-red-600 text-white rounded-md px-6 py-3"
              onClick={(e) => handleProtectedLinkClick(e, "/collections")}
            >
              Explore Collections
            </Link>
          </div>
        </div>
      </section>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </>
  );
}
