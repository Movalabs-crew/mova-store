import Image from "next/image";
import { LANDING_IMAGES } from "./landingImages";

const categories = [
  {
    id: 1,
    name: "Men Shoes",
    price: 99.99,
    imageUrl: LANDING_IMAGES.menShoes,
  },
  {
    id: 2,
    name: "Kids Shoes",
    price: 129.99,
    imageUrl: LANDING_IMAGES.kidsShoes,
  },
  {
    id: 3,
    name: "Casual Sneakers",
    price: 79.99,
    imageUrl: LANDING_IMAGES.aeroRunner,
  },
  {
    id: 4,
    name: "Women Shoes",
    price: 149.99,
    imageUrl: LANDING_IMAGES.womenShoes,
  },
  {
    id: 5,
    name: "Formal Shoes",
    price: 139.99,
    imageUrl: LANDING_IMAGES.formalShoes,
  },
];

export default function ShopByCategory() {
  return (
    <section className="bg-white py-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm uppercase tracking-widest text-purple-700 font-semibold mb-2">
            Shop by category
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            The right pair for every part of your day
          </h2>
          <p className="text-gray-600 mt-4">
            From the school run to the boardroom — find the style that fits.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative w-full aspect-square bg-white flex items-center justify-center p-3">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500">From {`$${category.price}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
