import Image from "next/image";
import Link from "next/link";

const products = [
  { id: 1, name: "Aero Runner", price: 89, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", tag: "Bestseller" },
  { id: 2, name: "City Stride", price: 95, image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&q=80" },
  { id: 3, name: "Trailhead Boot", price: 120, image: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=400&q=80", tag: "New" },
  { id: 4, name: "Court Classic", price: 75, image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80" },
  { id: 5, name: "Cloudknit", price: 110, image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80", tag: "Bestseller" },
];

const Catalogue = () => {
  return (
    <section className="bg-mova-surface/60 py-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10">
          <div>
            <p className="text-sm uppercase tracking-widest text-purple-700 font-semibold mb-2">
              Featured styles
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
              Picked for your rotation
            </h2>
          </div>
          <Link
            href="/shop"
            className="mt-4 sm:mt-0 text-purple-700 font-semibold hover:text-purple-600 inline-flex items-center gap-1"
          >
            View all shoes <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {products.map((p) => (
            <Link
              key={p.id}
              href="/shop"
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-3">
                {p.tag && (
                  <span className="absolute top-3 left-3 bg-purple-700 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {p.tag}
                  </span>
                )}
                <Image
                  src={p.image}
                  alt={p.name}
                  width={220}
                  height={220}
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {p.name}
                </h3>
                <p className="text-gray-500 text-sm">From ${p.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Catalogue;
