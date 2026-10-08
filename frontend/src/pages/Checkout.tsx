import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { formatMoney } from "../lib/money";

function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCartStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [confirmedOrderTotal, setConfirmedOrderTotal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <Link
          to="/marketplace"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition mt-4"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!phoneNumber.trim()) {
      setError("Please enter your Mobile Money number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderItems = items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      }));

      const response = await api.post("/api/orders", {
        items: orderItems,
        phoneNumber: phoneNumber.trim(),
      });

      setConfirmedOrderTotal(response.data.order.totalAmount);
      setPaymentMessage(response.data.message || "Approve the Telecel Cash prompt on your phone to complete payment.");
      clearCart();
      setOrderPlaced(true);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || "Failed to place order");
      } else {
        setError("Failed to place order");
      }
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Order Created
          </h1>
          <p className="text-gray-600 mb-2">
            Order total: <span className="font-semibold">{formatMoney(confirmedOrderTotal ?? 0)}</span>
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-6">
            {paymentMessage} Your order will show as paid after Paystack confirms your authorization.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/orders" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition">
              View My Orders
            </Link>
            <Link to="/marketplace" className="border border-gray-200 px-6 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              <div className="divide-y">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="py-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × {formatMoney(item.price)}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Money Number */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Telecel Cash Payment</h2>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 024XXXXXXX or 055XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                We’ll send a Telecel Cash payment prompt to this number. Approve it on your phone; the order is paid only after Paystack confirms the transaction.
              </p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Estimated subtotal</span>
                  <span>{formatMoney(totalPrice())}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Estimated total</span>
                  <span className="text-blue-600">
                    {formatMoney(totalPrice())}
                  </span>
                </div>
              </div>

              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
                A Telecel Cash authorization request will be sent to the phone number above. Stock is reserved for up to 15 minutes while you approve the request.
              </p>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Sending payment request..." : "Place Order & Pay"}
              </button>

              <Link
                to="/cart"
                className="block text-center text-gray-500 text-sm mt-4 hover:text-gray-700"
              >
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
