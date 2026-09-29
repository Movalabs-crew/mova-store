"use client";
import React, { useState, useEffect } from "react";
import { deleteProduct } from "../../lib/products";
import { useProducts } from "../../hooks/useProducts";
import AddProductForm from "./AddProductForm";
import EditProductForm from "./EditProductForm";
import AdminGuard from "../../components/AdminGuard";
import Modal from "../../components/Modal";
import Link from "next/link";
import { SiStellar } from "react-icons/si";
import { MdInventory } from "react-icons/md";

const ProductsAdminContent = () => {
  const { products, error } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState(null);
  // Issue #564: a stray click on Delete used to destroy a product with no way
  // back. Destructive actions go through a confirmation dialog instead.
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
  };

  const handleDeleteCancel = () => {
    // The buttons disable while the request is in flight so a second
    // confirmation cannot fire a second delete.
    if (isDeleting) return;
    setProductToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      // deleteProduct invalidates the shared cache, so the hook above
      // refetches the list with the row removed.
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product: ", error);
    } finally {
      setIsDeleting(false);
    }
  };

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
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6 text-gray-800">{product.name}</td>
                  <td className="py-4 px-6 text-gray-800">${Number(product.price).toFixed(2)}</td>
                  <td className="py-4 px-6">
                    <img
                      src={product.img}
                      alt={product.name}
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
                      className="text-red-600 hover:text-red-800 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded px-1"
                      onClick={() => handleDeleteClick(product)}
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

      <Modal show={Boolean(productToDelete)} onClose={handleDeleteCancel} title="Delete product">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Delete product</h2>
        <p className="text-gray-600 mb-2">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{productToDelete?.name}</span>? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleDeleteCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            aria-label={`Confirm deleting ${productToDelete?.name ?? "product"}`}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
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
