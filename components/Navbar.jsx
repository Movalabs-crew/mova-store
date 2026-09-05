"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { useAuth } from "../lib/AuthContext";
import { logout } from "../lib/auth";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { useRouter } from "next/navigation";
import { TfiAngleRight } from "react-icons/tfi";

const navLinkClass =
  "text-md font-medium text-mova-ink/80 hover:text-purple-600 transition-colors duration-200";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-mova-deep text-sm font-bold text-white shadow-mova transition group-hover:scale-105">
        M
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-mova-ink">
        Mova <span className="text-purple-600">Store</span>
      </span>
    </Link>
  );
}

function Navbar() {
  const router = useRouter();

  useEffect(() => {
    const handleLinkClick = (event) => {
      const href = event.currentTarget.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        event.preventDefault();
        targetElement.scrollIntoView({ behavior: "smooth" });
      } else {
        event.preventDefault();
        router.push(`/${href}`);
      }
    };

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach((link) => link.addEventListener("click", handleLinkClick));

    return () => {
      links.forEach((link) => link.removeEventListener("click", handleLinkClick));
    };
  }, [router]);
  const { toast, showToast, hideToast } = useToast(3000);

  const [showNav, setShowNav] = useState(false);
  const { user } = useAuth();

  const toggleNav = () => setShowNav(!showNav);
  const closeNavOnClick = () => setShowNav(false);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("cartItems");
      localStorage.removeItem("itemCount");
      localStorage.removeItem("totalPrice");
      router.push("/");
      showToast("Logged out successfully");
    } catch (error) {
      showToast(error.message);
    }
  };

  const handleProtectedLinkClick = (e, path) => {
    if (!user) {
      e.preventDefault();
      closeNavOnClick();
      showToast("Kindly login first");
      router.push("/profile/login");
    } else {
      e.preventDefault();
      closeNavOnClick();
      router.push(path);
    }
  };

  return (
    <>
      <nav className="fixed z-10 w-full border-b border-purple-100/80 bg-white/85 backdrop-blur-md">
        <div className="hidden items-center justify-between px-3 py-2 sm:px-6 md:flex">
          <BrandMark />
          <div className="hidden md:flex md:gap-6">
            <Link href="/" className={navLinkClass}>
              Home
            </Link>
            <Link
              href={user ? "/shop" : "/profile/login"}
              className={navLinkClass}
              onClick={(e) => handleProtectedLinkClick(e, "/shop")}
            >
              Shop
            </Link>
            <Link
              href={user ? "/collections" : "/profile/login"}
              className={navLinkClass}
              onClick={(e) => handleProtectedLinkClick(e, "/collections")}
            >
              Collections
            </Link>
            <Link href="#aboutus" className={navLinkClass}>
              About Us
            </Link>
            <Link href="/blog" className={navLinkClass}>
              Blog
            </Link>
            <Link href="#contact" className={navLinkClass}>
              Contact Us
            </Link>
            {user && (
              <Link href="/orders" className={navLinkClass}>
                Orders
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-mova-mist" />
                  )}
                  <span className="text-md font-medium text-mova-ink">{user.displayName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-purple-700 px-4 py-2 text-md font-medium text-white hover:bg-purple-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/profile/login">
                  <button className="rounded-md bg-purple-700 px-4 py-2 text-md font-medium text-white hover:bg-purple-600 focus:outline-none">
                    Login
                  </button>
                </Link>
                <Link href="/profile/login">
                  <button className="rounded-md border border-purple-500 px-4 py-2 text-md font-medium text-purple-700 transition hover:bg-purple-700 hover:text-white focus:outline-none">
                    SignUp
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 sm:px-6 md:hidden">
          <BrandMark />
          {showNav ? (
            <AiOutlineClose className="h-9 w-10 pr-2 text-mova-ink" onClick={toggleNav} />
          ) : (
            <AiOutlineMenu className="h-9 w-10 pr-2 text-mova-ink" onClick={toggleNav} />
          )}
        </div>
        {showNav && (
          <div className="fixed inset-y-0 right-0 z-50 flex h-screen w-1/2 flex-col items-center bg-white py-6 shadow-mova">
            <button className="mb-4 mr-4 self-end" onClick={toggleNav}>
              <AiOutlineClose className="h-10 w-8" />
            </button>
            <div className="w-full divide-y-2 divide-dashed divide-purple-200">
              {[
                { href: "/", label: "Home", onClick: closeNavOnClick },
                {
                  href: user ? "/shop" : "/profile/login",
                  label: "Shop",
                  onClick: (e) => handleProtectedLinkClick(e, "/shop"),
                },
                {
                  href: user ? "/collections" : "/profile/login",
                  label: "Collections",
                  onClick: (e) => handleProtectedLinkClick(e, "/collections"),
                },
                { href: "#aboutus", label: "About Us", onClick: closeNavOnClick },
                { href: "/blog", label: "Blog", onClick: closeNavOnClick },
                { href: "#contact", label: "Contact Us", onClick: closeNavOnClick },
                ...(user ? [{ href: "/orders", label: "My Orders", onClick: closeNavOnClick }] : []),
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex w-full items-center justify-between py-2 pr-4 text-md font-medium text-mova-ink transition-colors hover:text-purple-600"
                  onClick={item.onClick}
                >
                  <span className="pl-2">{item.label}</span>
                  <TfiAngleRight size={20} />
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-4 text-center">
              {user ? (
                <>
                  <div className="mx-2 flex items-center gap-2">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-mova-mist" />
                    )}
                    <span className="text-sm font-medium text-mova-ink">{user.displayName}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeNavOnClick();
                    }}
                    className="rounded-md bg-purple-700 px-4 py-2 text-md font-medium text-white hover:bg-purple-600 focus:outline-none"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Link href="/profile/login" onClick={closeNavOnClick}>
                    <button className="rounded-md bg-purple-700 px-4 py-2 text-md font-medium text-white hover:bg-purple-600 focus:outline-none">
                      Login
                    </button>
                  </Link>
                  <Link href="/profile/login" onClick={closeNavOnClick}>
                    <button className="rounded-md border border-purple-500 px-4 py-2 text-md font-medium text-purple-700 transition hover:bg-purple-700 hover:text-white focus:outline-none">
                      SignUp
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <Toast message={toast.message} show={toast.show} onClose={hideToast} />
      </nav>
    </>
  );
}

export default Navbar;
