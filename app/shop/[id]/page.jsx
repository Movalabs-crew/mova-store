"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../../context/CartContext";
import CartModal from "../../../components/CartModal";
import Toast from "../../../components/Toast";
import Cart from "../../../components/Cart";
import useToast from "../../../hooks/useToast";
import { getProductById } from "../../../lib/products";
import LoadingSpinner from "../../../components/LoadingSpinner";

const ProductPage = ({ params }) => {
  const { itemCount, cartItems, addToCart, removeFromCart, totalPrice } = useCart();
  const { toast, showToast, hideToast } = useToast(3000);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [id, setId] = useState(null);

  // Next 15 types the `params` prop as `Promise<SegmentParams>` — see the
  // generated route types at .next/types/app/shop/[id]/page.ts. Next 14 and the
  // component tests pass a plain object. `Promise.resolve` accepts both, so a
  // single code path covers either version.
  //
  // Reading `params.id` directly is the trap here: under Next 15 `params` is a
  // promise, so the destructure silently yields `undefined`, every product page
  // renders "Product not found", and nothing fails — not the build, not `tsc`
  // (this file is plain JS, so it is not type-checked), and not the test suite,
  // which passes a plain object and never asserts the fetch.
  useEffect(() => {
    let cancelled = false;

    Promise.resolve(params).then((resolved) => {
      if (!cancelled) setId(resolved?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        if (data) {
          setProduct(data);
        } else {
          setError("Product not found");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleCheckout = () => {
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
      <div className="container max-w-screen-xl mx-auto py-8 mt-10">
        <Cart itemCount={itemCount} onClick={openModal} />

        {loading && <LoadingSpinner />}
        {error && (
          <div className="flex flex-col items-center justify-center my-32">
            <h1 className="text-2xl font-bold text-purple-700">Error: {error}</h1>
          </div>
        )}
        {!loading && !error && product && (
          <>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            <Image src={product.img} alt={product.name} width={400} height={400} />
            <div className="flex space-x-4 items-center my-4">
              <h2 className="text-4xl">${product.price}</h2>
              <button
                className="flex border border-purple-800 rounded-md px-4 py-2 justify-between items-center hover:bg-purple-700"
                onClick={() => {
                  addToCart(product);
                  showToast("Item added to cart");
                }}
              >
                <FaShoppingCart /> <span className="px-2">Add to Cart</span>
              </button>
            </div>
          </>
        )}
      </div>

      <Toast message={toast.message} show={toast.show} onClose={hideToast} />
      <CartModal
        show={showModal}
        onClose={closeModal}
        cartItems={cartItems}
        totalPrice={totalPrice}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />
    </>
  );
};

export default ProductPage;
