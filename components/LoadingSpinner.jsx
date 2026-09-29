import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center" role="status" aria-live="polite">
        <div className="loader border-t-4 border-purple-700 rounded-full w-16 h-16 mx-auto animate-spin"></div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
