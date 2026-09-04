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
      <section className="relative h-screen overflow-hidden bg-mova-hero bg-cover bg-center">
        <div className="absolute inset-0 bg-mova-mesh mova-drift opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-mova-deep/80 via-mova-violet/45 to-mova-ink/75" />

        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="mova-fade-up font-display text-5xl font-extrabold tracking-tight text-white sm:text-7xl md:text-8xl">
            Mova Store
          </p>
          <h1 className="mova-fade-up-delay mt-5 max-w-2xl font-display text-2xl font-semibold text-mova-soft sm:text-3xl">
            Move in style. Pay on Stellar.
          </h1>
          <p className="mova-fade-up-delay-2 mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Curated footwear with a checkout that takes cards or USDC — escrowed on-chain until your
            order ships.
          </p>
          <div className="mova-fade-up-delay-2 mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              className="rounded-md bg-purple-600 px-7 py-3 font-semibold text-white shadow-mova transition hover:bg-purple-500"
              href={user ? "/shop" : "#"}
              onClick={(e) => handleProtectedLinkClick(e, "/shop")}
            >
              Shop Now
            </Link>
            <Link
              href="#stellar"
              className="rounded-md border border-white/60 px-7 py-3 font-semibold text-white transition hover:border-purple-300 hover:bg-purple-600/40"
            >
              Pay with Stellar
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
