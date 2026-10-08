import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { formatMoney } from "../../lib/money";

interface LedgerTransaction {
  id: string;
  reference: string;
  type: string;
  party: string;
  email: string;
  grossAmount: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: string;
}

interface BusinessIncome {
  sellerId: string;
  businessName: string;
  name: string;
  email: string;
  orderCount: number;
  grossIncome: number;
}

interface LedgerData {
  transactions: LedgerTransaction[];
  businessIncome: BusinessIncome[];
  periodStart: string;
  periodEnd: string;
}

const money = formatMoney;

function AdminLedger() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLedger = async () => {
      try {
        const response = await api.get("/api/admin/ledger");
        setData(response.data);
      } catch (loadError) {
        console.error("Failed to load ledger", loadError);
        setError("Failed to load the ledger. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadLedger();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading ledger...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        <p className="text-red-600">{error || "Ledger unavailable"}</p>
        <Link to="/admin" className="inline-block mt-4 text-blue-600 hover:underline">Back to Admin</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">System Ledger</h1>
            <p className="text-gray-600 mt-1">Customer payment records and seller payout requests.</p>
          </div>
          <Link to="/admin" className="px-4 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-100">
            Back to Admin
          </Link>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-800">Business Gross Income</h2>
            <p className="text-sm text-gray-500 mt-1">
              Paid sales from {new Date(data.periodStart).toLocaleDateString()} to {new Date(data.periodEnd).toLocaleDateString()} (rolling 14 days).
            </p>
          </div>
          {data.businessIncome.length === 0 ? (
            <p className="text-gray-500">No seller businesses are registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px]">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Business</th>
                    <th className="pb-3 font-medium">Account</th>
                    <th className="pb-3 font-medium">Paid Orders</th>
                    <th className="pb-3 font-medium">Gross Income</th>
                  </tr>
                </thead>
                <tbody>
                  {data.businessIncome.map((business) => (
                    <tr key={business.sellerId} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-800">{business.businessName}</td>
                      <td className="py-3 text-sm text-gray-600">
                        <span className="block">{business.name}</span>
                        <span className="text-gray-400">{business.email}</span>
                      </td>
                      <td className="py-3">{business.orderCount}</td>
                      <td className="py-3 font-semibold">{money(business.grossIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-800">All Transactions</h2>
            <p className="text-sm text-gray-500 mt-1">Payment attempts and payout requests, including pending and failed records.</p>
          </div>
          {data.transactions.length === 0 ? (
            <p className="text-gray-500">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Type / Reference</th>
                    <th className="pb-3 font-medium">Account</th>
                    <th className="pb-3 font-medium">Gross</th>
                    <th className="pb-3 font-medium">Fee</th>
                    <th className="pb-3 font-medium">Net</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr key={`${transaction.type}-${transaction.id}`} className="border-b last:border-0">
                      <td className="py-3 text-sm text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</td>
                      <td className="py-3">
                        <p className="font-medium">{transaction.type}</p>
                        <p className="text-xs font-mono text-gray-400">{transaction.reference.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-sm">{transaction.party}</p>
                        <p className="text-xs text-gray-400">{transaction.email}</p>
                      </td>
                      <td className="py-3">{money(transaction.grossAmount)}</td>
                      <td className="py-3">{money(transaction.fee)}</td>
                      <td className="py-3 font-medium">{money(transaction.netAmount)}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
                          {transaction.status}
                        </span>
                      </td>
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

export default AdminLedger;
