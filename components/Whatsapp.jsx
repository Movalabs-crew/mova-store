import { FaWhatsapp } from "react-icons/fa";
import Link from "next/link";

const Whatsapp = () => {
  return (
    <div className="fixed top-[75vh] right-4 z-40">
      <Link
        href="https://wa.me/2349065165097"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Mova Store on WhatsApp (opens in a new tab)"
        className="p-3 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 transition-all duration-300"
      >
        <FaWhatsapp size={24} aria-hidden="true" />
      </Link>
    </div>
  );
};

export default Whatsapp;
