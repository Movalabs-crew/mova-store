import { FaWhatsapp } from "react-icons/fa";
import Link from "next/link";
const goWhatsapp = () => {
    alert("You clicked me")
}
const Whatsapp = () => {
  return (
    <div className="fixed top-[75vh] right-4">
      <Link
        href="https://wa.me/2349065165097"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact us on WhatsApp"
        className="flex items-center justify-center p-2 rounded-full bg-purple-600 text-white shadow-md hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 transition-all duration-300"
      >
        <FaWhatsapp size={24} />
      </Link>
    </div>
  );
};

export default Whatsapp;
