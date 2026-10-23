
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { navigation } from "../config/navigation";

function getPageTitle(path) {
  for (const item of navigation) {
    if (item.path === path) return item.label;

    if (item.children) {
      const child = item.children.find(
        (entry) => entry.path === path
      );

      if (child) return child.label;
    }
  }

  return "QuarryOS";
}

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className={`app-layout ${
        sidebarOpen ? "sidebar-open" : ""
      }`}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="app-main">
        <Header
          title={getPageTitle(location.pathname)}
          onMenuClick={() =>
            setSidebarOpen((open) => !open)
          }
        />

        <main
          className="app-content"
          key={location.pathname}
          onClick={() => setSidebarOpen(false)}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
