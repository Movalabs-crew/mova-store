"use client";
import dynamic from "next/dynamic";
import Hero from "./(landingpage)/Hero";
import Carousel from "./(landingpage)/Categories";
import Catalogue from "./(landingpage)/Catalogue";
import Catalogue2 from "./(landingpage)/Catalogue2";
import Catalogue3 from "./(landingpage)/Catalogue3";
import Stellar from "./(landingpage)/Stellar";
import Features from "./(landingpage)/Features";
import HowItWorks from "./(landingpage)/HowItWorks";

// The sections below the fold are split into their own client chunks: they are
// never needed for first paint, and ContactUs pulls `@emailjs/browser` in via
// lib/sendmail, so this keeps the email client out of the initial JavaScript for
// `/`. See docs/BUNDLE_BUDGET.md before importing a new section statically.
const Slider = dynamic(() => import("./(landingpage)/Slider"));
const Testimonials = dynamic(() => import("./(landingpage)/Testimonials"));
const FAQ = dynamic(() => import("./(landingpage)/FAQ"));
const AboutUs = dynamic(() => import("./(landingpage)/Aboutus"));
const Newsletter = dynamic(() => import("./(landingpage)/newsletter"));
const ContactUs = dynamic(() => import("./(landingpage)/ContactUs"));

export default function FirstPage() {
  return (
    <>
      {/* Hero & Product Showcase */}
      <Hero />
      <Carousel />
      <Catalogue />

      {/* Why Mova Store */}
      <Catalogue2 />

      {/* Stellar Payment Section */}
      <Stellar />
      <Features />
      <HowItWorks />

      {/* Our Story */}
      <Catalogue3 />
      <Slider />

      {/* Social Proof */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* Mission & OSS */}
      <AboutUs />

      {/* Newsletter & Contact */}
      <Newsletter />
      <ContactUs />
    </>
  );
}
