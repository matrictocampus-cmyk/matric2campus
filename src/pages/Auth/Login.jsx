import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

// Detects Supabase rate-limit responses (HTTP 429 or known message patterns)
function isRateLimit(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  return /too many|rate.limit|wait.*second|security purposes/i.test(err.message || "");
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Synchronous lock — prevents double-fire before React re-renders with loading=true
  const submittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If a request is already in-flight, ignore completely
    if (submittingRef.current) return;

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (isRateLimit(authError)) {
          setError("Too many sign-in attempts. Please wait a minute and try again.");
        } else if (authError.message?.toLowerCase().includes("invalid login")) {
          setError("Incorrect email or password. Please try again.");
        } else {
          setError(authError.message);
        }
        return;
      }

      // Success — App.jsx's onAuthStateChange listener handles routing
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-900">Welcome Back</h2>
      <p className="text-center text-gray-500 text-sm">Sign in to continue your application</p>

      <div className="space-y-3">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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
            Signing in…
          </span>
        ) : "Sign In"}
      </button>

      <p className="text-center text-xs text-gray-400">
        New here? <span className="font-medium">Take the quiz</span> to create your profile.
      </p>
    </form>
  );
}
