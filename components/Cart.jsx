import { FaShoppingCart } from "react-icons/fa";

const Cart = ({ itemCount, onClick }) => {
  return (
    <div className="fixed bottom-20 left-8">
      <button
        className="relative p-3 rounded-full bg-purple-500 text-white shadow-md hover:bg-purple-700 transition-all duration-300"
        onClick={onClick}
      >
        <FaShoppingCart size={34} className="relative z-10" />
        {itemCount > 0 && (
          <span className="absolute -top-2 animate-bounce right-0  flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-purple-600 rounded-full">
            {itemCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default Cart;
