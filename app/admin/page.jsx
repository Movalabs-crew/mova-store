"use client";
import React, { useState, useRef, useEffect } from "react";
import { deleteProduct } from "../../lib/products";
import { useProducts } from "../../hooks/useProducts";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";
import AdminGuard from "../../components/AdminGuard";
import Toast from "../../components/Toast";
import useToast from "../../hooks/useToast";
import Link from "next/link";
import { SiStellar } from "react-icons/si";
import { MdInventory } from "react-icons/md";
import Image from "next/image";

const ProductsAdminContent = () => {
  const { products, error } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState(null);
  // Product ids whose delete request is in flight. Kept as state so the row is
  // hidden optimistically (a stale refresh cannot resurrect it) and as a ref so
  // a double-click is de-duplicated synchronously.
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const inFlightDeletes = useRef(new Set());
  const { toast, showToast, hideToast } = useToast(6000);

  useEffect(() => {
    if (error) {
      console.error("Error fetching products: ", error);
    }
  }, [error]);

  const handleProductAdded = () => {
    setSelectedProductId(null);
  };

  const handleProductUpdated = () => {
    setSelectedProductId(null);
  };

  const handleDelete = async (id, name) => {
    // A delete that is already in flight for this id must not be issued twice;
    // the ref is read synchronously so a rapid double-click cannot race it.
    if (inFlightDeletes.current.has(id)) return;
    inFlightDeletes.current.add(id);

    // Functional update: the pending set is derived from its previous value, so
    // it cannot be clobbered by an interleaved add/refresh render.
    setPendingDeletes((prev) => (prev.includes(id) ? prev : [...prev, id]));
    try {
      // deleteProduct invalidates the shared cache, so the hook above
      // refetches the list with the row removed.
      await deleteProduct(id);
    } catch (error) {
      console.error("Error deleting product: ", error);
      // The cache was not invalidated, so the row stays on screen. Say that the
      // deletion failed instead of leaving the operator to guess why the
      // product is still listed.
      showToast(`Could not delete ${name ? `"${name}"` : "the product"}: ${error.message}`);
    } finally {
      inFlightDeletes.current.delete(id);
      setPendingDeletes((prev) => prev.filter((pendingId) => pendingId !== id));
    }
  };

  // Hide rows whose delete is in flight, even if a concurrent refetch returns
  // them before the delete has settled. The next successful refetch omits them
  // from the server list for good.
  const visibleProducts = products.filter((product) => !pendingDeletes.includes(product.id));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors"
        >
          <MdInventory className="text-xl" />
          Products
        </Link>
        <Link
          href="/admin/orders"
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors"
        >
          <SiStellar className="text-xl" />
          Stellar Orders
        </Link>
      </div>

      <h1 className="text-4xl font-extrabold mb-8 text-center text-purple-600">Products Admin</h1>
      <AddProductForm onProductAdded={handleProductAdded} />
      {selectedProductId && (
        <EditProductForm productId={selectedProductId} onProductUpdated={handleProductUpdated} />
      )}
      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-6">Product List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="py-3 px-6 border-b text-left">Name</th>
                <th className="py-3 px-6 border-b text-left">Price</th>
                <th className="py-3 px-6 border-b text-left">Image</th>
                <th className="py-3 px-6 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6 text-gray-800">{product.name}</td>
                  <td className="py-4 px-6 text-gray-800">${Number(product.price).toFixed(2)}</td>
                  <td className="py-4 px-6">
                    <Image
                      src={product.img}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="h-20 w-20 object-cover rounded-lg border border-gray-300"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <button
                      type="button"
                      aria-label={`Edit ${product.name}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold mr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${product.name}`}
                      disabled={pendingDeletes.includes(product.id)}
                      className="text-red-600 hover:text-red-800 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded px-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleDelete(product.id, product.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Toast
        variant="error"
        message={toast.message}
        show={toast.show}
        onClose={hideToast}
        time={6000}
      />
    </div>
  );
};

const ProductsAdmin = () => {
  return (
    <AdminGuard>
      <ProductsAdminContent />
    </AdminGuard>
  );
};

export default ProductsAdmin;
