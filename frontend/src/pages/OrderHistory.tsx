import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { formatMoney } from "../lib/money";

interface OrderItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
  payment: {
    status: string;
    providerStatus?: string;
    providerMessage?: string;
    expiresAt: string;
  } | null;
}

function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get("/api/orders/my-orders");
      setOrders(response.data);
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-purple-100 text-purple-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
            <p className="text-gray-600 mt-1">View orders and Mobile Money payment status.</p>
          </div>
          <button type="button" onClick={() => void fetchOrders()} className="rounded-lg border bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Refresh status
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">You haven’t placed any orders yet.</p>
            <Link to="/marketplace" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b">
                  <div>
                    <p className="text-sm text-gray-500">Order ID: <span className="font-mono font-medium text-gray-800">{order._id.slice(-8).toUpperCase()}</span></p>
                    <p className="text-sm text-gray-500 mt-1">Placed {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>{order.status}</span>
                    <span className="font-bold text-lg text-gray-800">{formatMoney(order.totalAmount)}</span>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <div className="divide-y">
                    {order.items.map((item, index) => (
                      <div key={`${item.product}-${index}`} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity} × {formatMoney(item.price)}</p>
                        </div>
                        <p className="font-medium">{formatMoney(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {order.payment && order.status === "pending" && (
                  <div className="border-t bg-amber-50 px-6 py-4 text-sm text-amber-900">
                    <p className="font-semibold">Telecel Cash payment {order.payment.status === "pending" ? "awaiting confirmation" : order.payment.status}.</p>
                    <p>{order.payment.providerMessage || "Approve the payment prompt on your phone. Your order will update after Paystack confirms payment."}</p>
                    <p className="mt-1 text-xs">This payment request expires {new Date(order.payment.expiresAt).toLocaleString()}.</p>
                  </div>
                )}
                {order.payment?.status === "failed" && order.payment.providerMessage && (
                  <div className="border-t bg-red-50 px-6 py-4 text-sm text-red-800">Payment failed: {order.payment.providerMessage}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistory;
