"use client";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
import Cart from "../../components/Cart";
import CartModal from "../../components/CartModal";
import Toast from "../../components/Toast";
import useToast from "../../hooks/useToast";
import { useProducts } from "../../hooks/useProducts";
import { ProductGridSkeleton } from "../../components/Skeleton";

export default function Products() {
  const { itemCount, cartItems, addToCart, removeFromCart, totalPrice } = useCart();
  const { toast, showToast, hideToast } = useToast(3000);
  const [showModal, setShowModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { products, loading, error } = useProducts();

  const handleCheckout = (e) => {
    setIsCheckingOut(true);
    e.preventDefault();
    if (cartItems.length > 0) {
      window.location.href = "/checkout";
    } else {
      showToast("There is nothing in your cart");
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <>
      <div className="w-full max-w-screen-xl mx-auto py-8">
        <Cart itemCount={itemCount} onClick={openModal} />
        <section className="h-[70vh] overflow-auto">
          <h1 className="font-display text-4xl sm:text-6xl py-4 flex justify-center items-center font-extrabold text-mova-ink">
            Welcome to Mova Store
          </h1>

          {error && <p className="text-red-500 text-center">{error}</p>}

          {loading ? (
            <ProductGridSkeleton />
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((prod) => (
                <div key={prod.id} className="p-4 border rounded-lg shadow">
                  <Link href={`/shop/${prod.id}`}>
                    <Image
                      src={prod.img} // Ensure this URL is correct
                      alt={prod.name}
                      width={200}
                      height={200}
                      className="mb-2"
                    />
                    <h2 className="text-xl font-bold">{prod.name}</h2>
                    <p className="text-lg">${prod.price}</p>
                  </Link>
                  <button
                    className="border-purple-800 rounded-full px-2 py-2 mt-2 border-2 hover:border-purple-600"
                    onClick={() => {
                      addToCart(prod);
                      showToast("Item added to cart");
                    }}
                  >
                    <FaShoppingCart />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Only when the fetch resolved empty. On rejection the error above
            // is the whole story, and showing "no products yet" beside it would
            // read as an empty catalogue rather than a failed request.
            !error && <p className="text-center py-16 text-mova-ink/70">No products yet.</p>
          )}
        </section>
      </div>

      <Toast message={toast.message} show={toast.show} onClose={hideToast} />
      <CartModal
        show={showModal}
        onClose={closeModal}
        cartItems={cartItems}
        totalPrice={totalPrice}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        checkoutLabel={isCheckingOut ? "CheckingOut..." : "CheckOut"}
      />
    </>
  );
}
