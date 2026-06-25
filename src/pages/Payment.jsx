// src/pages/Payment.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const [bucket, setBucket] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  // load from navigation state first, fallback to localStorage
  useEffect(() => {
    let pkg = location.state?.package;
    let bk = location.state?.bucket;

    if (!pkg || !bk) {
      // fallback to localStorage
      try {
        const storedPkg = localStorage.getItem("txi_selected_package");
        const storedBucket = localStorage.getItem("txi_apply_bucket");

        if (storedPkg) pkg = JSON.parse(storedPkg);
        if (storedBucket) bk = JSON.parse(storedBucket);
      } catch (e) {
        console.warn("Failed to load package/bucket from storage", e);
      }
    }

    if (!pkg) setError("No package selected. Please return to Apply page.");
    else setSelectedPackage(pkg);

    if (!bk || !Array.isArray(bk)) setBucket([]);
    else setBucket(bk);

  }, [location.state]);

  // Save package locally for persistence (optional)
  useEffect(() => {
    if (selectedPackage) {
      localStorage.setItem("txi_selected_package", JSON.stringify(selectedPackage));
    }
  }, [selectedPackage]);

  // calculate total
  const totalAmount = selectedPackage?.price || 0;

  // simulate payment
  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      // Here you could integrate PayFast / Stripe / Supabase Payments later
      await new Promise((resolve) => setTimeout(resolve, 1200)); // simulate delay

      setPaid(true);
      setInfo("Payment successful! 🎉 Your application has been submitted.");

      // clear localStorage bucket
      localStorage.removeItem("txi_apply_bucket");
      localStorage.removeItem("selectedCoursesForApply");
      localStorage.removeItem("txi_selected_package");

    } catch (e) {
      console.error("Payment error", e);
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPackage) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-red-600 mb-3">No package selected. Please return to the Apply page.</p>
        <Button onClick={() => navigate("/apply")}>Go Back to Apply</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center">Payment</h1>

      {info && <div className="p-3 bg-green-50 border border-green-100 rounded text-green-700">{info}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700">{error}</div>}

      {/* package summary */}
      <div className="border rounded-xl p-5 space-y-2">
        <h2 className="font-semibold text-xl">{selectedPackage.label}</h2>
        <p>Price: <strong>R{selectedPackage.price}</strong></p>
        {selectedPackage.limits && Object.keys(selectedPackage.limits).length > 0 && (
          <div className="text-sm text-gray-600">
            Limits:
            <ul className="list-disc pl-5">
              {Object.entries(selectedPackage.limits).map(([type, limit]) => (
                <li key={type}>{type.toUpperCase()}: max {limit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* bucket summary */}
      <div className="border rounded-xl p-5 space-y-2">
        <h2 className="font-semibold text-xl">Your Selected Courses ({bucket.length})</h2>
        {bucket.length === 0 ? (
          <p className="text-gray-500">No courses added yet.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {bucket.map((c, idx) => (
              <li key={idx}>
                {c.title} ({String(c.type || "").toUpperCase()})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-xl font-bold">Total to Pay: R{totalAmount}</div>
        <Button onClick={handlePay} disabled={loading || paid}>
          {loading ? "Processing..." : paid ? "Paid ✅" : "Pay Now"}
        </Button>
      </div>

      {paid && (
        <div className="mt-4 text-center">
          <p>Thank you! You can now return to your dashboard or start a new application.</p>
          <div className="mt-2 flex justify-center gap-3">
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            <Button onClick={() => navigate("/apply")}>Start New Application</Button>
          </div>
        </div>
      )}
    </div>
  );
}
