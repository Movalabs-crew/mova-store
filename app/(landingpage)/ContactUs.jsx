"use client";
import { useState, useRef } from "react";
import { FaGithub, FaTwitter, FaDiscord } from "react-icons/fa";
import sendMail from "../../lib/sendmail";

const socialLinks = [
  {
    name: "GitHub",
    icon: FaGithub,
    href: "https://github.com/ShoeSafari-Hub/ShoeSafari",
    description: "View source code",
  },
  {
    name: "Twitter",
    icon: FaTwitter,
    href: "https://twitter.com/shoesafari",
    description: "Follow for updates",
  },
  {
    name: "Discord",
    icon: FaDiscord,
    href: "https://discord.gg/shoesafari",
    description: "Join the community",
  },
];

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [toast, setToast] = useState({ show: false, message: "" });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useRef();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendMail(formData);
      showToast("Message sent successfully!");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      setError("Failed to send message.");
      showToast("Unable to send message, please try again later");
    }
    setIsLoading(false);
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
  };

  return (
    <div
      id="contact"
      className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 py-16 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get in Touch
          </h2>
          <p className="text-white/90 max-w-xl mx-auto">
            Questions, feedback, or want to contribute? Reach out through
            any channel below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Social Links */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              Connect with us
            </h3>
            <div className="space-y-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors group"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600">
                    <link.icon size={24} />
                  </span>
                  <div>
                    <p className="font-semibold text-white group-hover:underline">
                      {link.name}
                    </p>
                    <p className="text-sm text-white/70">{link.description}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-white/80 text-sm">
                ShoeSafari is open source. Contributions welcome!
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white shadow-lg rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Send us a message
            </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message"
              rows="4"
              className="border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </form>
          </div>
        </div>
      </div>

      {toast.show && (
        <div className="fixed bottom-5 right-5 bg-gray-800 text-white p-3 rounded shadow-lg transition-transform transform translate-y-0 ease-in-out duration-300">
          {toast.message}
          <button
            onClick={() => setToast({ show: false, message: "" })}
            className="ml-4 text-red-500"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactUs;
