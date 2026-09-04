import "../styles/global.css";
import { Syne, Manrope } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Navbar from "../components/Navbar";
import ScrollToTop from "../components/ScrollToTop";
import Whatsapp from "../components/Whatsapp";
import Footer from "../components/Footer";
import { AuthProvider } from "../lib/AuthContext";
import Head from "next/head";
import logo from "../public/images/favicon.ico";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-mova-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-mova-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Mova Store",
  description: "Curated footwear with Stellar crypto checkout",
  openGraph: {
    type: "website",
    url: "https://mova-store.vercel.app/",
    title: "Mova Store",
    description: "Curated footwear with Stellar crypto checkout",
    images: [
      {
        url: "https://mova-store.vercel.app/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mova Store",
      },
    ],
  },
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable}`}>
      <Head>
        <link rel="icon" href={logo} width="300px" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon?<generated>" type="image/<generated>" sizes="<generated>" />
        <link
          rel="apple-touch-icon"
          href="/apple-icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
      </Head>
      <body className="h-full font-body antialiased">
        <NextTopLoader color="#7c3aed" showSpinner={false} />

        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="app flex-grow pt-10">{children}</main>
            <Whatsapp />
            <ScrollToTop />
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
