import Image from "next/image";
import shoeImage2 from "/public/images/shoe2.png";

const Catalogue4 = () => {
  return (
    <section className="px-4 md:px-10 bg-purple-700 py-12">
      <div className="flex flex-wrap justify-center md:justify-between items-center sm:mx-[100px] mx-none">
        <div className="w-full md:w-1/2 text-center md:text-left text-white">
          <div className="flex flex-col  justify-center md:justify-start">
            <h2 className="text-2xl my-2">Shopping That Works Around You</h2>
            <p>
              Browse by size, category or style, add to cart in one click, and
              check out the way you prefer — card, or USDC on Stellar. If a pair
              does not work out, returns and exchanges are straightforward, and
              our support team actually answers when you reach out.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center md:justify-end mb-8 md:mb-0 md:pr-8 pt-10 sm:pt-0">
          <Image
            src={shoeImage2}
            alt="Simple shopping experience at Mova Store"
            width={400}
            height={350}
            className="rounded-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default Catalogue4;
