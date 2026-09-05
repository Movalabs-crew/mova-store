import Image from "next/image";

const Catalogue3 = () => {
  return (
    <section className="bg-mova-surface/60 py-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
        <div className="w-full md:w-1/2">
          <p className="text-sm uppercase tracking-widest text-purple-700 font-semibold mb-2">
            Our story
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Where quality meets innovation
          </h2>
          <div className="flex flex-col gap-4 text-gray-600 leading-relaxed">
            <p>
              Mova Store started because we wanted better — better shoes, and a better way to pay
              for them. We were tired of slow settlements, hidden fees, and payment systems that
              hadn't evolved in decades.
            </p>
            <p>
              So we built a store that proves there's a better way: quality footwear you can trust,
              with Stellar-powered checkout that settles in seconds and costs a fraction of a cent.
              This is what modern e-commerce should look like.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center">
          <Image
            src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80"
            alt="A pair from the Mova Store catalog"
            width={440}
            height={360}
            className="rounded-xl shadow-sm object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default Catalogue3;
