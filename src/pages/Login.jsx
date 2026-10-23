
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

const getDashboardPath = (role) => {
  switch (role) {
    case "super_admin":
    case "general_manager":
      return "/";

    case "department_manager":
    case "data_entry_officer":
    case "viewer_auditor":
      return "/department-dashboard";

    default:
      return null;
  }
};

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      const data = response.data;

      const token = data.accessToken || data.token;
      const user = data.user;

      if (!token) {
        setError("Login response did not include an access token.");
        return;
      }

      if (!user?.role) {
        setError("Login response did not include a valid user role.");
        return;
      }

      const dashboardPath = getDashboardPath(user.role);

      if (!dashboardPath) {
        setError("Your account role is not authorized to access this application.");
        return;
      }

      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("currentUser", JSON.stringify(user));

      navigate(dashboardPath, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-mark">Q</div>

        <p className="login-eyebrow">QUARRYOS MANAGEMENT SYSTEM</p>
        <h1>Welcome back</h1>
        <p className="login-description">
          Sign in with your authorized staff account.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          Access is restricted to authorized personnel.
        </p>
      </section>
    </main>
  );
}
