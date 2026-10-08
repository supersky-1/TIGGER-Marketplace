import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Buy & Sell with Confidence
            </h1>
            <p className="mt-6 text-lg md:text-xl text-blue-100 leading-relaxed">
              Discover quality products from verified sellers. Fast, secure, and
              built for Africa.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/marketplace"
                className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 shadow-lg"
              >
                Browse Products
              </Link>
              {!user && (
                <Link
                  to="/register"
                  className="bg-blue-500/30 backdrop-blur text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 hover:bg-blue-500/40"
                >
                  Become a Seller
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Why Choose Us?
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Everything you need for a smooth buying and selling experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🛒</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Easy Shopping
              </h3>
              <p className="text-gray-600">
                Browse thousands of products and checkout in just a few clicks.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Secure Payments
              </h3>
              <p className="text-gray-600">
                Mobile Money support with secure transactions and order tracking.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Grow Your Business
              </h3>
              <p className="text-gray-600">
                Sellers get powerful tools to manage products, orders, and revenue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of buyers and sellers on our platform today.
          </p>
          <Link
            to="/marketplace"
            className="inline-block bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 shadow-md"
          >
            Explore Products
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
