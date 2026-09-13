import { FaShoppingCart } from "react-icons/fa";

const Cart = ({ itemCount = 0, onClick }) => {
  const label =
    itemCount > 0
      ? `Shopping cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`
      : "Shopping cart is empty";

  return (
    <div className="fixed bottom-20 left-8 z-40">
      <button
        type="button"
        aria-label={label}
        className="relative p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 transition-all duration-300"
        onClick={onClick}
      >
        <FaShoppingCart size={32} className="relative z-10" aria-hidden="true" />
        {itemCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-2 animate-bounce right-0 flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-purple-700 rounded-full"
          >
            {itemCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default Cart;
