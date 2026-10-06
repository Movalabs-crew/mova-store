import Link from "next/link";

const Custom404 = () => {
  return (
    <div className=" bg-error-image bg-center bg-cover flex flex-col justify-center items-center bg-gray-100 min-h-[80vh] px-4">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-4 max-w-md text-gray-600">
          Sorry, we couldn&apos;t find the page you were looking for. It may have
          been moved or deleted.
        </p>
        <Link
          href="/"
          className="mt-8 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default Custom404;
