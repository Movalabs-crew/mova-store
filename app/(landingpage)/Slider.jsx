import Image from "next/image";

const images = [
  "/images/shoe1.png",
  "/images/shoe2.png",
  "/images/shoe3.png",
  "/images/shoe4.png",
  "/images/shoe5.png",
];

const Slider = () => {
  return (
    <section className="flex max-w-screen-2xl overflow-x-auto">
      {[...images, ...images].map((src, index) => (
        <Image
          key={index}
          src={src}
          alt="ShoeSafari footwear"
          width={190}
          height={20}
          className="flex-shrink-0"
        />
      ))}
    </section>
  );
};

export default Slider;
