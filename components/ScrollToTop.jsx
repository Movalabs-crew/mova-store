"use client";
import { useState, useEffect } from "react";
import { FaAngleDoubleUp } from "react-icons/fa";
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isVisible && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top of page"
          className="p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 transition-all duration-300"
        >
          <FaAngleDoubleUp size={22} className="hover:animate-bounce" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
