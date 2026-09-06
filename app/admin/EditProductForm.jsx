"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  getProductById,
  updateProduct,
  uploadProductImage,
} from "../../lib/products";

const EditProductForm = ({ productId, onProductUpdated }) => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      setSuccessMessage("");
      setErrorMessage("");
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
    setLoading(true);

    try {
      let imageUrl = existingImageUrl;

      if (productImage) {
        imageUrl = await uploadProductImage(productImage);
      }

      await updateProduct(productId, {
        name: productName,
        price: parseFloat(productPrice),
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
      <h1 className="text-3xl font-bold mb-6 text-center text-purple-500">
        Edit Product
      </h1>
      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div className="mb-4 p-4 text-white bg-green-500 rounded-md">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 text-white bg-red-500 rounded-md">
            {errorMessage}
          </div>
        )}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Name
          </label>
          <input
            type="text"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Price
          </label>
          <input
            type="number"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Image
          </label>
          <input
            type="file"
            accept="image/*"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onChange={(e) => setProductImage(e.target.files[0])}
          />
          {existingImageUrl && (
            <div className="relative mt-4 w-full h-48">
              <Image
                src={existingImageUrl}
                alt="Existing product"
                fill
                style={{ objectFit: "contain" }}
                className="rounded-md"
              />
            </div>
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
