import Image from "next/image";
import shoeImage5 from "/public/images/shoe5.png";

const Catalogue5 = () => {
  return (
    <section className="px-4 md:px-10 bg-purple-700 py-12">
      <div className="flex flex-wrap justify-center md:justify-between items-center sm:mx-[100px] mx-none">
        <div className="w-full md:w-1/2 flex justify-center md:justify-start mb-8 md:mb-0 md:pr-8">
          <Image
            src={shoeImage5}
            alt="Thoughtfully made footwear at Mova Store"
            width={400}
            height={350}
            className="rounded-lg"
          />
        </div>
        <div className="w-full md:w-1/2 text-center md:text-left text-white">
          <div className="flex flex-col justify-center md:justify-start">
            <h2 className="text-2xl my-2">Kind to Feet, Lighter on the Planet</h2>
            <p>
              The most sustainable pair is the one you never send back. Accurate
              sizing, durable materials and careful packaging mean fewer
              returns, less waste and less freight. We also keep stock tight on
              purpose — every pair we sell was actually wanted, not
              mass-produced into a warehouse.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Catalogue5;
