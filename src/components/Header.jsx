
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";

export default function Header({ title, onMenuClick }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      const token = sessionStorage.getItem("accessToken");

      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("currentUser");
      navigate("/login", { replace: true });
    }
  }

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    user = null;
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <Menu size={21} />
        </button>

        <h5 className="header-title">{title || "Dashboard"}</h5>
      </div>

      <div className="header-right">
        <div className="header-user">
          <span className="header-user-name">
            {user?.fullName || "User"}
          </span>
          <small>
            {(user?.role || "").replaceAll("_", " ")}
          </small>
        </div>

        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={handleLogout}
        >
          <LogOut size={16} className="me-1" />
          Logout
        </button>
      </div>
    </header>
  );
}
