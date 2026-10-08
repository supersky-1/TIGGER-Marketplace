import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
}

interface ProductEditForm {
  description: string;
  price: string;
  stock: string;
}

interface BusinessSummary {
  businessName?: string;
  businessDescription?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  verificationStatus: string;
}

interface OrderItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  buyer: {
    name: string;
    email: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: string;
  sellerStatus: string;
  createdAt: string;
}

function SellerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessSummary | null>(null);
  const [businessProfileError, setBusinessProfileError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productEditForm, setProductEditForm] = useState<ProductEditForm>({
    description: "",
    price: "",
    stock: "",
  });
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [productsResult, ordersResult, profileResult] = await Promise.allSettled([
        api.get("/api/products/my-products"),
        api.get("/api/orders/seller-orders"),
        api.get("/api/auth/profile"),
      ]);

      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value.data);
      } else {
        console.error("Failed to load seller products", productsResult.reason);
      }
      if (ordersResult.status === "fulfilled") {
        setOrders(ordersResult.value.data);
      } else {
        console.error("Failed to load seller orders", ordersResult.reason);
      }
      if (profileResult.status === "fulfilled") {
        setBusinessProfile(profileResult.value.data);
        setBusinessProfileError(false);
      } else {
        console.error("Failed to load seller business profile", profileResult.reason);
        setBusinessProfileError(true);
      }
      setLoading(false);
    };

    void fetchData();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await api.patch(`/api/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, sellerStatus: res.data.sellerStatus } : order
        )
      );
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const startProductEdit = (product: Product) => {
    setEditingProductId(product._id);
    setProductEditForm({
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
    });
  };

  const saveProductEdit = async (productId: string) => {
    const price = Number(productEditForm.price);
    const stock = Number(productEditForm.stock);
    if (
      !productEditForm.description.trim() ||
      !productEditForm.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      !productEditForm.stock.trim() ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      alert("Enter a description, a valid non-negative price, and a whole-number stock quantity.");
      return;
    }

    setSavingProductId(productId);
    try {
      const response = await api.patch(`/api/products/${productId}`, {
        description: productEditForm.description,
        price,
        stock,
      });
      setProducts((previous) =>
        previous.map((product) =>
          product._id === productId ? response.data : product
        )
      );
      setEditingProductId(null);
    } catch (error) {
      console.error("Failed to update product", error);
      alert("Failed to update product. Check the description, price, and stock values.");
    } finally {
      setSavingProductId(null);
    }
  };

  const removeProduct = async (productId: string) => {
    if (!window.confirm("Remove this product from the marketplace?")) return;

    setDeletingProductId(productId);
    try {
      await api.delete(`/api/products/${productId}`);
      setProducts((previous) => previous.filter((product) => product._id !== productId));
      if (editingProductId === productId) setEditingProductId(null);
    } catch (error) {
      console.error("Failed to remove product", error);
      alert("Failed to remove product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Seller Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              to="/profile"
              className="bg-white border border-gray-200 text-gray-700 px-3 sm:px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Business Profile
            </Link>
            <Link
              to="/seller/payouts"
              className="bg-green-600 text-white px-3 sm:px-5 py-2.5 rounded-lg text-sm hover:bg-green-700 transition"
            >
              Payouts
            </Link>
            <Link
              to="/seller/add-product"
              className="bg-blue-600 text-white px-3 sm:px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700 transition"
            >
              + Add New Product
            </Link>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-5 sm:p-6 mb-8" aria-labelledby="business-profile-heading">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Your storefront</p>
              <h2 id="business-profile-heading" className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 break-words">
                {businessProfile?.businessName || user?.name || "Business profile"}
              </h2>
              {businessProfile?.verificationStatus && (
                <span className="inline-flex mt-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">
                  {businessProfile.verificationStatus} verification
                </span>
              )}
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                {businessProfile?.businessDescription || "Add a short description so customers can learn about your business."}
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit business profile
            </Link>
          </div>
          {businessProfileError && (
            <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Business details could not be loaded. Refresh the page to try again.
            </p>
          )}
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <dt className="text-xs font-medium text-gray-500">Business email</dt>
              <dd className="mt-1 text-sm text-gray-800 break-words">{businessProfile?.businessEmail || "Not added"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Business phone</dt>
              <dd className="mt-1 text-sm text-gray-800 break-words">{businessProfile?.businessPhone || "Not added"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Business address</dt>
              <dd className="mt-1 text-sm text-gray-800 break-words">{businessProfile?.businessAddress || "Not added"}</dd>
            </div>
          </dl>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Products</h3>
            <p className="text-2xl font-bold mt-1">{products.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Orders</h3>
            <p className="text-2xl font-bold mt-1">{orders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Revenue</h3>
            <p className="text-2xl font-bold mt-1">
              {formatMoney(orders
                .reduce((sum, order) => sum + order.totalAmount, 0)
                )}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Manage Orders</h2>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Buyer</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Update Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b last:border-0">
                      <td className="py-4 text-sm font-mono">
                        {order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="font-medium">{order.buyer.name}</p>
                          <p className="text-sm text-gray-500">
                            {order.buyer.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.quantity}× {item.name}
                          </div>
                        ))}
                      </td>
                      <td className="py-4 font-medium">
                        {formatMoney(order.totalAmount)}
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(
                            order.sellerStatus
                          )}`}
                        >
                          {order.sellerStatus}
                        </span>
                      </td>
                      <td className="py-4">
                        <select
                          value={order.sellerStatus}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                          disabled={
                            updatingId === order._id ||
                            !["paid", "shipped"].includes(order.sellerStatus)
                          }
                          className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={order.sellerStatus}>
                            {order.sellerStatus.charAt(0).toUpperCase() + order.sellerStatus.slice(1)}
                          </option>
                          {order.sellerStatus === "paid" && <option value="shipped">Shipped</option>}
                          {order.sellerStatus === "shipped" && <option value="delivered">Delivered</option>}
                        </select>
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Your Products</h2>

          {loading ? (
            <p className="text-gray-500">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-500">You haven't added any products yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Product Name</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} className="border-b last:border-0">
                      <td className="py-4 min-w-64">
                        <p className="font-medium">{product.name}</p>
                        {editingProductId === product._id ? (
                          <textarea
                            aria-label={`Description for ${product.name}`}
                            value={productEditForm.description}
                            onChange={(event) =>
                              setProductEditForm((form) => ({ ...form, description: event.target.value }))
                            }
                            rows={2}
                            className="mt-2 w-full border rounded-lg px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                        )}
                      </td>
                      <td className="py-4">
                        {editingProductId === product._id ? (
                          <input
                            aria-label={`Price for ${product.name}`}
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={productEditForm.price}
                            onChange={(event) =>
                              setProductEditForm((form) => ({ ...form, price: event.target.value }))
                            }
                            className="w-24 border rounded-lg px-2 py-1.5"
                          />
                        ) : (
                          formatMoney(product.price)
                        )}
                      </td>
                      <td className="py-4">
                        {editingProductId === product._id ? (
                          <input
                            aria-label={`Stock for ${product.name}`}
                            type="number"
                            required
                            min="0"
                            step="1"
                            value={productEditForm.stock}
                            onChange={(event) =>
                              setProductEditForm((form) => ({ ...form, stock: event.target.value }))
                            }
                            className="w-20 border rounded-lg px-2 py-1.5"
                          />
                        ) : (
                          product.stock
                        )}
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        {editingProductId === product._id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveProductEdit(product._id)}
                              disabled={savingProductId === product._id}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {savingProductId === product._id ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingProductId(null)}
                              disabled={savingProductId === product._id}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => startProductEdit(product)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeProduct(product._id)}
                              disabled={deletingProductId === product._id}
                              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {deletingProductId === product._id ? "Removing..." : "Remove"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerDashboard;
