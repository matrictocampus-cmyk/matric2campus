import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

// Detects Supabase rate-limit responses (HTTP 429 or known message patterns)
function isRateLimit(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  return /too many|rate.limit|wait.*second|security purposes|email.*limit/i.test(err.message || "");
}

export default function Register({ onLoginClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Synchronous lock — prevents double-fire before React re-renders with loading=true
  const submittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If a request is already in-flight, ignore completely
    if (submittingRef.current) return;

    setError("");
    setSuccess(false);

    // Client-side validation — checked before any network call
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (isRateLimit(authError)) {
          setError("Too many sign-up attempts. Please wait a minute and try again.");
        } else if (authError.message?.toLowerCase().includes("already registered")) {
          setError("An account with this email already exists. Try signing in instead.");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert([{
          user_id: authData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

        if (profileError) {
          setError("Account created but profile setup failed. Please contact support@txi.ac.za");
          return;
        }

        setSuccess(true);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center space-y-4">
        <div className="text-5xl">📧</div>
        <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
        <p className="text-gray-600 text-sm">
          We sent a confirmation link to <strong>{email}</strong>.<br />
          Click the link in that email, then come back here to sign in.
        </p>
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-900">Create Your Account</h2>
      <p className="text-center text-gray-500 text-sm">It's free — no credit card needed</p>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating account…
          </span>
        ) : "Create Account"}
      </button>

      {onLoginClick && (
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-emerald-600 font-semibold hover:underline"
          >
            Sign in here
          </button>
        </p>
      )}
    </form>
  );
}
