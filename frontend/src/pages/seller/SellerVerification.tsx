import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function SellerVerification() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [businessName, setBusinessName] = useState(user?.name || "");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/api/auth/profile");
        if (response.data.businessName) setBusinessName(response.data.businessName);
      } catch (profileError) {
        console.error("Failed to load seller business name", profileError);
      }
    };
    void loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!files || files.length === 0) {
      setError("Please upload at least one document");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("businessName", businessName);

      Array.from(files).forEach((file) => {
        formData.append("documents", file);
      });

      const res = await api.post("/api/verification/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Update local user state
      if (res.data.user) {
        login(
          {
            id: res.data.user._id || res.data.user.id,
            name: res.data.user.name,
            email: res.data.user.email,
            role: res.data.user.role,
          },
          localStorage.getItem("token") || ""
        );
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Failed to submit documents";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Documents Submitted!
          </h1>
          <p className="text-gray-600 mb-6">
            Your business documents have been submitted successfully.  
            An admin will review them shortly.
          </p>
          <button
            onClick={() => navigate("/seller/dashboard")}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-2">Seller Verification</h1>
        <p className="text-gray-600 mb-6">
          Please upload your business documents so we can verify your account.
          You will only be able to sell after approval.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Business Name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Business Documents
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Upload business registration, ID, or any relevant documents (PDF, JPG, PNG – max 5 files)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SellerVerification;
