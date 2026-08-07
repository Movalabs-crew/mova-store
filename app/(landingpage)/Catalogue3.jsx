import Image from "next/image";
import shoeImage4 from "/public/images/shoe4.png";

const Catalogue3 = () => {
  return (
    <section className="px-4 md:px-10 bg-white py-12">
      <div className="flex flex-wrap justify-center md:justify-between items-center sm:mx-[100px] mx-none">
        <div className="w-full md:w-1/2 flex justify-center md:justify-start mb-8 md:mb-0 md:pr-8">
          <Image
            src={shoeImage4}
            alt="A pair from the ShoeSafari catalog"
            width={400}
            height={350}
            className="rounded-lg"
          />
        </div>
        <div className="w-full md:w-1/2 text-center md:text-left">
          <div className="flex flex-col justify-center md:justify-start">
            <h2 className="text-2xl my-2">Our Story</h2>
            <p>
              ShoeSafari started the way most good ideas do — out of
              frustration. We were tired of ordering shoes online and receiving
              the wrong size, or knock-offs that fell apart within a month. So
              we built the store we wished existed: a tight, honest catalog of
              quality footwear, photographed truthfully, with straightforward
              pricing and a checkout that works for everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Catalogue3;
