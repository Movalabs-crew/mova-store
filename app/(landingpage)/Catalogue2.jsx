import Image from "next/image";
import shoeImage3 from "/public/images/shoe3.png";

const Catalogue = () => {
  return (
    <section className="px-4 md:px-10 bg-red-700 py-12 gap-10">
      <div className="flex flex-wrap justify-center md:justify-between items-center sm:mx-[100px] mx-none">
        <div className="w-full md:w-1/2 text-center md:text-left text-white">
          <div className="flex  flex-col justify-center md:justify-start">
            <h2 className="text-2xl my-2">From Street to Boardroom</h2>
            <p>
              Whatever the day throws at you, we have a pair for it. Lightweight
              sneakers for commutes and weekends, weather-ready boots for the
              rainy season, and sharp formal styles for the office. Every
              category ships with a detailed size guide and real, unedited
              photos, so your next pair fits the first time.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center md:justify-end mb-8 md:mb-0 md:pr-8 pt-10 sm:pt-0">
          <Image
            src={shoeImage3}
            alt="Footwear for every occasion at ShoeSafari"
            width={400}
            height={350}
            className="rounded-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default Catalogue;
