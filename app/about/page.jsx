import AboutUs from "../(landingpage)/Aboutus";

export const metadata = {
  title: "About Us | Mova Store",
  description: "Learn about Mova Store's mission to bring seamless Stellar blockchain payments to everyday e-commerce.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-mova-ink pt-16">
      <AboutUs />
    </div>
  );
}
