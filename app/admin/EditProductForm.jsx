"use client";
import React, { useState, useEffect } from "react";
import { getProductById, updateProduct, uploadProductImage } from "../../lib/products";
import Image from "next/image";

const EditProductForm = ({ productId, onProductUpdated }) => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    setSuccessMessage("");
    setErrorMessage("");
    setPriceError("");
 
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const product = await getProductById(productId);
        if (product) {
          setProductName(product.name);
          setProductPrice(product.price);
          setExistingImageUrl(product.img);
        } else {
          setErrorMessage("Product not found");
        }
      } catch (error) {
        setErrorMessage("Error fetching product: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setPriceError("");

    // Guard the edit boundary itself: clearing the field or typing a malformed
    // value yields NaN, and a negative value must never reach the data layer.
    const parsedPrice = parseFloat(productPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setPriceError("Please enter a valid price (0 or greater)");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = existingImageUrl;

      if (productImage) {
        imageUrl = await uploadProductImage(productImage);
      }

      await updateProduct(productId, {
        name: productName,
        price: parsedPrice,
        img: imageUrl,
      });

      setSuccessMessage("Product updated successfully!");
      onProductUpdated();
    } catch (error) {
      setErrorMessage("Error updating product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-purple-500">
      <h1 className="text-3xl font-bold mb-6 text-center text-purple-500">Edit Product</h1>
      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            data-testid="success-banner"
            className="mb-4 p-4 text-white bg-green-500 rounded-md"
          >
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div
            role="alert"
            data-testid="error-banner"
            className="mb-4 p-4 text-white bg-red-500 rounded-md"
          >
            {errorMessage}
          </div>
        )}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">Product Name</label>
          <input
            id="edit-product-name"
            type="text"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">Product Price</label>
          <input
            id="edit-product-price"
            type="number"
            min="0"
            step="0.01"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={productPrice}
            onChange={(e) => {
              setProductPrice(e.target.value);
              if (priceError) setPriceError("");
            }}
            aria-invalid={priceError ? "true" : undefined}
            aria-describedby={priceError ? "edit-product-price-error" : undefined}
            required
          />
          {priceError && (
            <p
              id="edit-product-price-error"
              role="alert"
              data-testid="price-error"
              className="mt-2 text-sm text-red-600"
            >
              {priceError}
            </p>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">Product Image</label>
          <input
            id="edit-product-image"
            type="file"
            accept="image/*"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onChange={(e) => setProductImage(e.target.files[0])}
          />
          {existingImageUrl && (
            <Image
              src={existingImageUrl}
              alt={productName ? `${productName} current image` : "Current product image preview"}
              width={400}
              height={300}
              className="mt-4 max-w-full h-auto rounded-md"
            />
          )}
        </div>
        <button
          type="submit"
          className={`w-full py-3 mt-4 text-white font-bold bg-purple-500 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? "Updating Product..." : "Update Product"}
        </button>
      </form>
    </div>
  );
};

export default EditProductForm;
