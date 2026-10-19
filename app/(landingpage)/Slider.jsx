import Image from "next/image";
import { LANDING_IMAGES } from "./landingImages";

const images = [
  LANDING_IMAGES.aeroRunner,
  LANDING_IMAGES.cityStride,
  LANDING_IMAGES.courtClassic,
  LANDING_IMAGES.cloudknit,
  LANDING_IMAGES.sliders,
];

const Slider = () => {
  return (
    <section className="py-14 overflow-hidden bg-mova-surface/60">
      <div className="flex gap-6 overflow-x-auto px-6 md:px-10 pb-2">
        {images.map((src) => (
          <Image
            key={src}
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
