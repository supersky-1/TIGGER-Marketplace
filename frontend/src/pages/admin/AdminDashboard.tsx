import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface Stats {
  totalBuyers: number;
  totalSellers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  platformFee: number;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  joined: string;
  totalOrders: number;
  revenue: number;
  platformFee: number;
}

interface Payout {
  _id: string;
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  fee: number;
  grossAmount: number;
  status: string;
  adminNote?: string;
  createdAt: string;
}

interface PendingSeller {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  businessDocuments?: string[];
  verificationStatus: string;
  createdAt: string;
}

interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: "buyer" | "seller";
  isSuspended: boolean;
  suspensionReason?: string;
  verificationStatus: string;
  createdAt: string;
}

interface ManagedProduct {
  _id: string;
  name: string;
  price: number;
  stock: number;
  isActive?: boolean;
  seller: { name: string; email: string } | null;
}

interface AuditEntry {
  _id: string;
  action: string;
  targetName: string;
  reason: string;
  createdAt: string;
  admin: { name: string; email: string };
}

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [managedProducts, setManagedProducts] = useState<ManagedProduct[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get("/api/admin/stats"),
        api.get("/api/admin/sellers"),
        api.get("/api/payouts/all"),
        api.get("/api/verification/pending"),
        api.get("/api/admin/users"),
        api.get("/api/admin/products"),
        api.get("/api/admin/audit"),
      ]);
      const [statsRes, sellersRes, payoutsRes, pendingRes, usersRes, productsRes, auditRes] = results;
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      else console.error("Failed to load admin stats", statsRes.reason);
      if (sellersRes.status === "fulfilled") setSellers(sellersRes.value.data);
      else console.error("Failed to load sellers", sellersRes.reason);
      if (payoutsRes.status === "fulfilled") setPayouts(payoutsRes.value.data);
      else console.error("Failed to load payouts", payoutsRes.reason);
      if (pendingRes.status === "fulfilled") setPendingSellers(pendingRes.value.data);
      else console.error("Failed to load pending verifications", pendingRes.reason);
      if (usersRes.status === "fulfilled") setManagedUsers(usersRes.value.data);
      else console.error("Failed to load managed users", usersRes.reason);
      if (productsRes.status === "fulfilled") setManagedProducts(productsRes.value.data);
      else console.error("Failed to load moderated products", productsRes.reason);
      if (auditRes.status === "fulfilled") setAuditEntries(auditRes.value.data);
      else console.error("Failed to load admin audit", auditRes.reason);
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        await fetchData();
      } catch (error) {
        console.error("Failed to load admin data", error);
      }

      if (!isMounted) return;
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePayoutStatusChange = async (payoutId: string, newStatus: string) => {
    let note = "";
    if (newStatus === "rejected") {
      const enteredReason = window.prompt("Reason for rejecting this payout:");
      if (!enteredReason?.trim()) return;
      note = enteredReason.trim();
    }
    if (newStatus === "paid" && !window.confirm("Confirm that the approved payout has actually been sent to the seller?")) return;

    setUpdatingId(payoutId);
    try {
      await api.patch(`/api/payouts/${payoutId}/status`, { status: newStatus, note });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to update payout status");
    } finally {
      setUpdatingId(null);
    }
  };


  const handleVerification = async (userId: string, status: "approved" | "rejected") => {
    setUpdatingId(userId);
    try {
      await api.patch(`/api/verification/${userId}`, {
        status,
        note: status === "approved" ? "Approved by admin" : "Rejected by admin",
      });
      alert(`Seller ${status} successfully`);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to update verification status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUserSuspension = async (managedUser: ManagedUser) => {
    const suspended = !managedUser.isSuspended;
    const reason = window.prompt(
      suspended ? `Reason for suspending ${managedUser.name}:` : `Reason for reactivating ${managedUser.name}:`
    );
    if (!reason?.trim()) return;
    if (!window.confirm(`${suspended ? "Suspend" : "Reactivate"} ${managedUser.name}'s account?`)) return;

    setUpdatingId(managedUser._id);
    try {
      await api.patch(`/api/admin/users/${managedUser._id}/suspension`, {
        suspended,
        reason: reason.trim(),
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to update account status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProductModeration = async (product: ManagedProduct) => {
    const active = product.isActive === false;
    const reason = window.prompt(
      active ? `Reason for restoring ${product.name}:` : `Reason for removing ${product.name}:`
    );
    if (!reason?.trim()) return;
    if (!window.confirm(`${active ? "Restore" : "Remove"} ${product.name} ${active ? "to" : "from"} the shop?`)) return;

    setUpdatingId(product._id);
    try {
      await api.patch(`/api/admin/products/${product._id}/moderation`, {
        active,
        reason: reason.trim(),
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to update product listing");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome, {user?.name}
          </p>
          <Link
            to="/admin/ledger"
            className="inline-flex mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            View Ledger
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Buyers</h3>
            <p className="text-3xl font-bold mt-1">{stats ? stats.totalBuyers : "—"}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Sellers</h3>
            <p className="text-3xl font-bold mt-1">{stats?.totalSellers || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Revenue</h3>
            <p className="text-3xl font-bold mt-1">{formatMoney(stats?.totalRevenue || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm p-6 xl:col-span-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sellers</h2>
            {sellers.length === 0 ? (
              <p className="text-gray-500">No sellers found.</p>
            ) : (
              <div className="space-y-3">
                {sellers.slice(0, 5).map((seller) => (
                  <div key={seller.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{seller.name}</p>
                      <p className="text-xs text-gray-500">{seller.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{formatMoney(seller.revenue)}</p>
                      <p className="text-xs text-gray-500">{seller.totalOrders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 xl:col-span-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Payout Requests</h2>
            {payouts.length === 0 ? (
              <p className="text-gray-500">No payouts available.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div key={payout._id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">{payout.seller.name}</p>
                        <p className="text-xs text-gray-500">{new Date(payout.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                    {payout.adminNote && <p className="text-xs text-gray-500 mt-1">Admin note: {payout.adminNote}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600">{formatMoney(payout.amount)}</p>
                      <div className="flex gap-2">
                        {payout.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePayoutStatusChange(payout._id, "processing")}
                              disabled={updatingId === payout._id}
                              className="px-2 py-1 text-xs rounded bg-green-600 text-white disabled:opacity-60"
                            >
                              {updatingId === payout._id ? "Updating..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePayoutStatusChange(payout._id, "rejected")}
                              disabled={updatingId === payout._id}
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {payout.status === "processing" && (
                          <button
                            type="button"
                            onClick={() => handlePayoutStatusChange(payout._id, "paid")}
                            disabled={updatingId === payout._id}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
                          >
                            {updatingId === payout._id ? "Updating..." : "Confirm Funds Released"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 xl:col-span-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Pending Sellers</h2>
            {pendingSellers.length === 0 ? (
              <p className="text-gray-500">No pending verification requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingSellers.slice(0, 4).map((seller) => (
                  <div key={seller._id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">{seller.name}</p>
                        <p className="text-xs text-gray-500">{seller.email}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(seller.verificationStatus)}`}>
                        {seller.verificationStatus}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={updatingId === seller._id}
                        onClick={() => handleVerification(seller._id, "approved")}
                        className="flex-1 px-2 py-1.5 rounded bg-green-600 text-white text-xs font-medium disabled:opacity-60"
                      >
                        {updatingId === seller._id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === seller._id}
                        onClick={() => handleVerification(seller._id, "rejected")}
                        className="flex-1 px-2 py-1.5 rounded bg-red-600 text-white text-xs font-medium disabled:opacity-60"
                      >
                        {updatingId === seller._id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-6 mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">Suspend or reactivate buyer and seller accounts. Admin accounts are excluded.</p>
          </div>
          {managedUsers.length === 0 ? (
            <p className="text-gray-500">No buyer or seller accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.map((managedUser) => (
                    <tr key={managedUser._id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-gray-800">{managedUser.name}</p>
                        <p className="text-sm text-gray-500">{managedUser.email}</p>
                        {managedUser.suspensionReason && (
                          <p className="text-xs text-red-600 mt-1">Reason: {managedUser.suspensionReason}</p>
                        )}
                      </td>
                      <td className="py-3 capitalize">{managedUser.role}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${managedUser.isSuspended ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                          {managedUser.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">{new Date(managedUser.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleUserSuspension(managedUser)}
                          disabled={updatingId === managedUser._id}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-60 ${managedUser.isSuspended ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
                        >
                          {updatingId === managedUser._id ? "Updating..." : managedUser.isSuspended ? "Reactivate" : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6 mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Product Moderation</h2>
            <p className="text-sm text-gray-500 mt-1">Removed products are hidden from the shop and can be restored by an admin.</p>
          </div>
          {managedProducts.length === 0 ? (
            <p className="text-gray-500">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Seller</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Listing</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {managedProducts.map((product) => (
                    <tr key={product._id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{product.name}</td>
                      <td className="py-3 text-sm text-gray-600">{product.seller?.name ?? "Unknown seller"}</td>
                      <td className="py-3">{formatMoney(product.price)}</td>
                      <td className="py-3">{product.stock}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${product.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                          {product.isActive !== false ? "Active" : "Removed"}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleProductModeration(product)}
                          disabled={updatingId === product._id}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-60 ${product.isActive !== false ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}
                        >
                          {updatingId === product._id ? "Updating..." : product.isActive !== false ? "Remove" : "Restore"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Admin Activity</h2>
          <p className="text-sm text-gray-500 mt-1">Latest 100 user, product, payment, and payout review actions.</p>
          </div>
          {auditEntries.length === 0 ? (
            <p className="text-gray-500">No admin moderation actions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">When</th>
                    <th className="pb-3 font-medium">Admin</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr key={entry._id} className="border-b last:border-0">
                      <td className="py-3 text-sm text-gray-500">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="py-3">{entry.admin?.name ?? "Deleted admin"}</td>
                      <td className="py-3 text-sm">{entry.action.replaceAll("_", " ")}</td>
                      <td className="py-3">{entry.targetName}</td>
                      <td className="py-3 text-sm text-gray-600">{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
