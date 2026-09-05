import Image from "next/image";

const images = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&q=80",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80",
];

const Slider = () => {
  return (
    <section className="py-14 overflow-hidden bg-mova-surface/60">
      <div className="flex gap-6 overflow-x-auto px-6 md:px-10 pb-2">
        {images.map((src, index) => (
          <Image
            key={img.id || img.url || index}
            src={src}
            alt="Mova Store footwear"
            width={240}
            height={240}
            className="flex-shrink-0 w-36 h-36 md:w-44 md:h-44 object-cover rounded-xl shadow-sm"
          />
        ))}
      </div>
    </section>
  );
};

export default Slider;
