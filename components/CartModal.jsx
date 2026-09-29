"use client";
import Image from "next/image";
import Modal from "./Modal";

/**
 * Shared cart modal body. The rows below were copied verbatim into both
 * `app/shop/page.jsx` and `app/shop/[id]/page.jsx`, so the duplicate-row key
 * logic (and every future fix to it) had to be applied twice. Both routes now
 * render this component instead.
 *
 * @param {boolean} show            - whether the modal is open
 * @param {() => void} onClose      - close handler passed to `Modal`
 * @param {Array} cartItems         - cart rows from `useCart()`
 * @param {number} totalPrice       - cart total from `useCart()`
 * @param {(item) => void} onRemove - removes one cart row
 * @param {() => void} onCheckout   - checkout handler
 * @param {string} checkoutLabel    - label for the checkout button
 */
const CartModal = ({
  show,
  onClose,
  cartItems,
  totalPrice,
  onRemove,
  onCheckout,
  checkoutLabel = "Checkout",
}) => {
  return (
    <Modal show={show} onClose={onClose}>
      <h2 className="text-2xl mb-4">Cart Items</h2>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div>
          {cartItems.map((item, index) => (
            <div
              key={item.cartItemId || item.lineId || `${item.id}-${index}`}
              className="flex justify-between items-center mb-2"
            >
              <div className="w-16 h-16 flex-shrink-0">
                <Image
                  src={item.img}
                  width={64}
                  height={64}
                  alt={`${item.name} image`}
                  className="object-cover w-full h-full"
                />
              </div>
              <span className="ml-4">{item.name}</span>
              <span className="ml-4">${item.price}</span>
              <button
                className="ml-4 bg-purple-500 text-white px-2 py-1 rounded"
                onClick={() => onRemove(item)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center mt-4 mx-5 sm:mx-10">
        <div>
          {cartItems.length > 0 && <strong>Total:</strong>}
          {totalPrice ? <span className="ml-2 font-bold ">${totalPrice.toFixed(2)}</span> : ""}
        </div>
        {cartItems.length > 0 && (
          <button onClick={onCheckout} className="bg-purple-500 text-white px-4 py-1 rounded mt-4">
            {checkoutLabel}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default CartModal;
