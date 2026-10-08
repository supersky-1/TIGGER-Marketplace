import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { formatMoney } from "../lib/money";

function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Your Cart is Empty
        </h1>
        <p className="text-gray-500 mb-6">
          Looks like you haven't added any products yet.
        </p>
        <Link
          to="/marketplace"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 text-sm"
          >
            Clear Cart
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.productId}
                className="p-6 flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-gray-500 mt-1">
                    {formatMoney(item.price)} each
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>

                  <div className="w-24 text-right font-medium">
                    {formatMoney(item.price * item.quantity)}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatMoney(totalPrice())}
              </span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
