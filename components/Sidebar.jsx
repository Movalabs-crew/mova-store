"use client";
import { useState } from "react";
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
import Modal from "../components/Modal";

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <>
      <aside className="w-64 bg-white text-gray-700 flex-shrink-0 hidden sm:block pt-10">
        <nav className="divide-y divide-gray-200">
          <ul className="px-5 py-6 space-y-2">
            <li onClick={openModal}>
              <input
                type="text"
                className="w-full bg-gray-100 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 cursor-pointer"
                placeholder="Search Shoes"
                readOnly
              />
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
            <li className="hover:text-white transition-colors duration-200 cursor-pointer" onClick={openModal}>
              <FaSearch size={20} className="mr-3 text-white" />
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
      <Modal show={showModal} onClose={closeModal}>
        <input
          type="text"
          className="w-full bg-gray-100 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
          placeholder="Search Shoes"
        />
      </Modal>
    </>
  );
}
