import Image from "next/image";

import shoeImage1 from "/public/images/shoe1.png";
import shoeImage2 from "/public/images/shoe2.png";
import shoeImage3 from "/public/images/shoe3.png";
import shoeImage4 from "/public/images/shoe4.png";
import shoeImage5 from "/public/images/shoe5.png";
const categories = [
  {
    id: 1,
    name: "Men Shoes",
    price: 99.99,
    imageUrl: shoeImage4,
  },
  {
    id: 2,
    name: "Kids Shoes",
    price: 129.99,
    imageUrl: shoeImage2,
  },
  {
    id: 3,
    name: "Casual Sneakers",
    price: 79.99,
    imageUrl: shoeImage1,
  },
  {
    id: 4,
    name: "Women Shoes",
    price: 149.99,
    imageUrl: shoeImage5,
  },
  {
    id: 5,
    name: "Formal Shoes",
    price: 139.99,
    imageUrl: shoeImage3,
  },
];

export default function ShopByCategory() {
  return (
    <div className="p-4 md:p-8 lg:p-12">
      <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-center">
        Shop by Category
      </h1>
      <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
        From the school run to the boardroom — find the right pair for every
        part of your day.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white shadow-lg rounded-lg overflow-hidden"
          >
            <div className="relative w-full h-48">
              <Image
                src={category.imageUrl}
                alt={category.name}
                layout="fill"
                objectFit="cover"
                className="rounded-t-lg"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{category.name}</h2>
              <p className="text-gray-700">From {`$${category.price}`}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
