import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getMediaUrl } from "../lib/api";

interface ProfileData {
  _id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  isVerified: boolean;
  verificationStatus: string;
  verificationNote?: string;
  businessName?: string;
  businessDescription?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessDocuments?: string[];
}

interface SellerProfileForm {
  name: string;
  email: string;
  businessName: string;
  businessDescription: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
}

const emptyForm: SellerProfileForm = {
  name: "",
  email: "",
  businessName: "",
  businessDescription: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
};

function Profile() {
  const { login } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<SellerProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/api/auth/profile");
        const data = response.data as ProfileData;
        setProfile(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          businessName: data.businessName ?? "",
          businessDescription: data.businessDescription ?? "",
          businessEmail: data.businessEmail ?? "",
          businessPhone: data.businessPhone ?? "",
          businessAddress: data.businessAddress ?? "",
        });
      } catch (fetchError) {
        console.error("Failed to load profile", fetchError);
        setError("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, []);

  const updateField = (field: keyof SellerProfileForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await api.patch("/api/auth/profile", form);
      const updated = response.data as ProfileData;
      setProfile(updated);
      setForm({
        name: updated.name,
        email: updated.email,
        businessName: updated.businessName ?? "",
        businessDescription: updated.businessDescription ?? "",
        businessEmail: updated.businessEmail ?? "",
        businessPhone: updated.businessPhone ?? "",
        businessAddress: updated.businessAddress ?? "",
      });
      const token = localStorage.getItem("token");
      if (token) {
        login({
          id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          isVerified: updated.isVerified,
          verificationStatus: updated.verificationStatus,
        }, token);
      }
      setSaved(true);
    } catch (saveError: unknown) {
      console.error("Failed to save profile", saveError);
      if (typeof saveError === "object" && saveError !== null && "response" in saveError) {
        const responseError = saveError as { response?: { data?: { message?: string } } };
        setError(responseError.response?.data?.message || "Failed to save your profile.");
      } else {
        setError("Failed to save your profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error || "Profile unavailable"}</div>;
  }

  if (profile.role !== "seller") {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
          <p className="text-gray-500 mt-1">Your account credentials are view-only.</p>
          <dl className="mt-8 divide-y">
            <div className="py-4">
              <dt className="text-sm text-gray-500">Full name</dt>
              <dd className="font-medium text-gray-900 mt-1">{profile.name}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-gray-500">Login email</dt>
              <dd className="font-medium text-gray-900 mt-1">{profile.email}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-gray-500">Password</dt>
              <dd className="font-medium text-gray-900 mt-1">••••••••</dd>
              <p className="text-xs text-gray-500 mt-1">Passwords are securely stored and cannot be viewed.</p>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Business Profile</h1>
            <p className="text-gray-500 mt-1">Manage the business and login details attached to your seller account.</p>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full capitalize ${profile.isVerified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {profile.verificationStatus}
          </span>
        </div>

        {profile.verificationNote && (
          <p className="mb-5 rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">{profile.verificationNote}</p>
        )}
        {error && <p className="mb-5 rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
        {saved && <p className="mb-5 rounded-lg bg-green-50 text-green-700 p-3 text-sm">Profile changes saved.</p>}

        <form onSubmit={saveProfile} className="space-y-7">
          <section>
            <h2 className="font-semibold text-gray-800 mb-4">Login Credentials</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-gray-700">
                Account name
                <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Login email
                <input type="email" required value={form.email} onChange={(event) => updateField("email", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Password changes are not available here. Passwords cannot be viewed.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800 mb-4">Business Details</h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Business name
                <input required value={form.businessName} onChange={(event) => updateField("businessName", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Business description
                <textarea rows={3} value={form.businessDescription} onChange={(event) => updateField("businessDescription", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Business email
                  <input type="email" value={form.businessEmail} onChange={(event) => updateField("businessEmail", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Business phone
                  <input type="tel" value={form.businessPhone} onChange={(event) => updateField("businessPhone", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Business address
                <input value={form.businessAddress} onChange={(event) => updateField("businessAddress", event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
            </div>
          </section>

          {profile.businessDocuments && profile.businessDocuments.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-800 mb-3">Verification Documents</h2>
              <ul className="space-y-2">
                {profile.businessDocuments.map((documentPath, index) => (
                  <li key={`${documentPath}-${index}`}>
                    <a href={getMediaUrl(documentPath)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                      View document {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link to="/seller/verification" className="block text-sm text-blue-600 hover:underline">
            Update business verification documents
          </Link>

          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {profile.businessName && (
            <Link to="/seller/dashboard" className="ml-4 text-sm text-gray-600 hover:underline">Back to dashboard</Link>
          )}
        </form>
      </div>
    </div>
  );
}

export default Profile;
