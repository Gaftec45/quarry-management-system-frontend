
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { getVisibleNavigation } from "../config/navigation";

function getIcon(iconName) {
  return LucideIcons[iconName] || LucideIcons.Circle;
}

function readCurrentUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem("currentUser") || "null"
    );
  } catch {
    return null;
  }
}

function NavigationItem({ item }) {
  const Icon = getIcon(item.icon);

  if (item.children) {
    return (
      <div className="sidebar-group">
        <div className="nav-caption">{item.label}</div>

        <nav className="navigation">
          {item.children.map((child) => {
            const ChildIcon = getIcon(child.icon);

            return (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.path === "/"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-icon">
                  <ChildIcon size={18} />
                </span>
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      className={({ isActive }) =>
        `nav-item ${isActive ? "active" : ""}`
      }
    >
      <span className="nav-icon">
        <Icon size={18} />
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const currentUser = useMemo(() => readCurrentUser(), []);

  const department =
    currentUser?.department?.name ||
    currentUser?.departmentName ||
    currentUser?.department?.code ||
    "";

  const visibleNavigation = getVisibleNavigation(
    currentUser?.role,
    department
  );

  const roleLabel = (currentUser?.role || "")
    .replaceAll("_", " ");

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">R</div>
        <div>
          <h2>
            Royal Mining & Chemical<span></span>
          </h2>
          <p>MANAGEMENT SYSTEM</p>
        </div>
      </div>

      <div className="sidebar-menu-scroll">
        <div className="nav-caption">WORKSPACE</div>

        <div className="sidebar-menu">
          {visibleNavigation.map((item) => (
            <NavigationItem
              key={item.path || item.label}
              item={item}
            />
          ))}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="system-indicator" />
        <div>
          <strong>
            {currentUser?.fullName || "Authenticated User"}
          </strong>
          <p className="text-capitalize">{roleLabel}</p>
          {department && (
            <p>{department}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
