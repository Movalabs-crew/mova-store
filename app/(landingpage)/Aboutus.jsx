import Image from "next/image";
import team from "../../public/images/ourteam.png";

export default function AboutUs() {
  return (
    <section id="aboutus" className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-red-700 text-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Our Mission</h1>
        <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
          To make quality footwear genuinely accessible — to anyone, anywhere,
          no matter how they prefer to pay. That means honest cataloging, fair
          prices, and a checkout that accepts both traditional cards and
          Stellar USDC, so more people can shop the way they want.
        </p>
      </div>
      <div className="flex flex-col md:flex-row justify-center items-center max-w-5xl mx-auto gap-8">
        <div className="w-full md:w-1/2 mb-8 md:mb-0">
          <Image
            src={team}
            alt="The ShoeSafari team"
            width={600} 
            height={400} 
            layout="intrinsic" 
            className="rounded-lg"
          />
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-semibold mb-4">What We're Building</h2>
          <p className="text-base md:text-lg leading-relaxed">
            A store where the shopping experience is as good as the shoes. We're
            investing in tools that remove friction — better fit guidance,
            transparent stock, and a payment stack built on the Stellar network
            that settles in seconds instead of days. Every drop and every update
            moves us a step closer to that.
          </p>
        </div>
      </div>
    </section>
  );
}
