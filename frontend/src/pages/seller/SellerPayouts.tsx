import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface Balance {
  grossRevenue: number;
  alreadyPaid: number;
  availableGross: number;
  platformFee: number;
  availableBalance: number;
  canWithdraw: boolean;
}

interface Payout {
  _id: string;
  amount: number;
  fee: number;
  grossAmount: number;
  status: string;
  adminNote?: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

function SellerPayouts() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchData = async () => {
    try {
      const [balanceRes, payoutsRes] = await Promise.all([
        api.get("/api/payouts/balance"),
        api.get("/api/payouts/my-payouts"),
      ]);
      setBalance(balanceRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [balanceRes, payoutsRes] = await Promise.all([
          api.get("/api/payouts/balance"),
          api.get("/api/payouts/my-payouts"),
        ]);

        if (!isMounted) return;

        setBalance(balanceRes.data);
        setPayouts(payoutsRes.data);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestPayout = async () => {
    if (!balance?.canWithdraw) return;

    setRequesting(true);
    try {
      await api.post("/api/payouts/request");
      alert("Payout request submitted. It is pending admin approval.");
      fetchData(); // refresh
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response!.data!
              .message
          : "Failed to request payout";

      alert(message);
    } finally {
      setRequesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
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
        <p className="text-gray-500">Loading payout information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Payouts</h1>
            <p className="text-gray-600 mt-1">
              Manage your earnings and withdrawals
            </p>
          </div>
          <Link
            to="/seller/dashboard"
            className="text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Total Gross Revenue</h3>
            <p className="text-2xl font-bold mt-1">
              {formatMoney(balance?.grossRevenue || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-gray-500 text-sm">Platform Fee (12.5%)</h3>
            <p className="text-2xl font-bold mt-1 text-red-600">
              -{formatMoney(balance?.platformFee || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-blue-200">
            <h3 className="text-gray-500 text-sm">Available for Withdrawal</h3>
            <p className="text-3xl font-bold mt-1 text-blue-600">
              {formatMoney(balance?.availableBalance || 0)}
            </p>
          </div>
        </div>

        {/* Request Payout Button */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Request Payout</h2>
          <p className="text-gray-600 mb-6">
            Requests start as pending and must be approved by an admin before the funds are released.
          </p>

          <button
            onClick={handleRequestPayout}
            disabled={!balance?.canWithdraw || requesting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting
              ? "Submitting..."
              : balance?.canWithdraw
              ? `Withdraw ${formatMoney(balance?.availableBalance || 0)}`
              : "No balance available"}
          </button>
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Payout History</h2>

          {payouts.length === 0 ? (
            <p className="text-gray-500">No payout requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Gross</th>
                    <th className="pb-3 font-medium">Fee (12.5%)</th>
                    <th className="pb-3 font-medium">You Receive</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id} className="border-b last:border-0">
                      <td className="py-4 text-sm">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        {formatMoney(payout.grossAmount)}
                      </td>
                      <td className="py-4 text-red-600">
                        -{formatMoney(payout.fee)}
                      </td>
                      <td className="py-4 font-medium text-green-600">
                        {formatMoney(payout.amount)}
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(
                            payout.status
                          )}`}
                        >
                          {payout.status}
                        </span>
                        {payout.adminNote && (
                          <p className="text-xs text-gray-500 mt-1">Admin note: {payout.adminNote}</p>
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

export default SellerPayouts;
