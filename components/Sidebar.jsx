"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaHome,
  FaInfoCircle,
  FaShoppingCart,
  FaList,
  FaSearch,
} from "react-icons/fa";
import { FcSportsMode } from "react-icons/fc";
import { useAuth } from "../lib/AuthContext";

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <aside className="w-64 bg-white text-gray-700 flex-shrink-0 hidden sm:block pt-10">
        <nav className="divide-y divide-gray-200">
          <ul className="px-5 py-6 space-y-2">
            <li>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 rounded-lg border border-gray-300 pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 text-sm"
                    placeholder="Search Shoes (Press Enter)"
                  />
                  <button
                    type="submit"
                    className="absolute right-2.5 top-2.5 text-gray-500 hover:text-purple-600"
                    aria-label="Submit search"
                  >
                    <FaSearch size={14} />
                  </button>
                </div>
              </form>
            </li>
            <li>
              <Link
                href="/"
                className="flex items-center p-4 hover:bg-gray-100 hover:text-purple-500 transition-colors duration-200"
              >
                <FaHome className="mr-3" />
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/shop"
                className="flex items-center p-4 hover:bg-gray-100 hover:text-purple-500 transition-colors duration-200"
              >
                <FaShoppingCart className="mr-3" />
                Shop
              </Link>
            </li>
            <li>
              <Link
                href="/collections"
                className="flex items-center p-4 hover:bg-gray-100 hover:text-purple-500 transition-colors duration-200"
              >
                <FcSportsMode className="mr-3" />
                Collections
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="flex items-center p-4 hover:bg-gray-100 hover:text-purple-500 transition-colors duration-200"
              >
                <FaList className="mr-3" />
                Blog
              </Link>
            </li>
            {isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  className="flex items-center p-4 hover:bg-gray-100 hover:text-purple-500 transition-colors duration-200"
                >
                  <FaInfoCircle className="mr-3" />
                  Admin
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </aside>

      {/* small screen mobile sidebar */}
      <aside className="flex flex-col justify-center w-10 bg-purple-600 text-gray-700 flex-shrink-0 sm:hidden pt-10">
        <nav className="divide-y divide-gray-200">
          <ul className="py-6 space-y-14 px-2">
            <li>
              <Link
                href="/shop"
                className="hover:text-white transition-colors duration-200"
                title="Search / Shop"
              >
                <FaSearch size={20} className="mr-3 text-white" />
              </Link>
            </li>
            <li>
              <Link
                href="/"
                className="hover:text-white transition-colors duration-200"
              >
                <FaHome className="mr-3 text-white" size={20} />
              </Link>
            </li>
            <li>
              <Link
                href="/shop"
                className="hover:text-white transition-colors duration-200"
              >
                <FaShoppingCart className="mr-3 text-white" size={20} />
              </Link>
            </li>
            <li>
              <Link
                href="/collections"
                className="hover:text-purple-500 transition-colors duration-200"
              >
                <FcSportsMode className="mr-3" size={20} />
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="hover:text-white transition-colors duration-200"
              >
                <FaList className="mr-3 text-white" size={20} />
              </Link>
            </li>
            {isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  className="hover:text-white transition-colors duration-200"
                >
                  <FaInfoCircle className="mr-3 text-white" size={20} />
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </aside>
    </>
  );
}
