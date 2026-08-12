import Image from "next/image";
import shoeImage1 from "/public/images/shoe1.png";

const About = () => {
  return (
    <section className="px-4 md:px-10 bg-white py-12">
      <div className="flex flex-wrap justify-center md:justify-between items-center sm:mx-[100px] mx-none">
        <div className="w-full md:w-1/2 mb-8 md:mb-0 md:pr-8 text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-light text-black pb-4">
            Why Mova Store
          </h2>
          <div className="flex flex-col gap-4 justify-center md:justify-start">
            <p>
              We built Mova Store around one idea: buying the right pair should
              be easy, honest and dependable. Every style we list is hand-picked
              from vetted manufacturers and photographed as it really looks, so
              what you see is what arrives at your door.
            </p>
            <p>
              Prices are transparent — no phantom markdowns, no surprise fees at
              checkout. And because you should be able to pay the way you want,
              we accept cards as well as USDC on the Stellar network, settled
              directly and instantly to our merchant wallet.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center md:justify-end">
          <Image
            src={shoeImage1}
            alt="Curated sneakers at Mova Store"
            width={400}
            height={350}
            className="rounded-lg"
          />
        </div>
      </div>
    </section>
  );
};

export default About;
