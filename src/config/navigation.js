
export const ROLE = {
  SUPER_ADMIN: "super_admin",
  GENERAL_MANAGER: "general_manager",
  DEPARTMENT_MANAGER: "department_manager",
  DATA_ENTRY_OFFICER: "data_entry_officer",
  VIEWER_AUDITOR: "viewer_auditor",
};

const ALL_ROLES = Object.values(ROLE);

const MANAGEMENT_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.GENERAL_MANAGER,
];

const DEPARTMENT_ROLES = [
  ROLE.DEPARTMENT_MANAGER,
  ROLE.DATA_ENTRY_OFFICER,
  ROLE.VIEWER_AUDITOR,
];

const normalizeDepartment = (department) =>
  String(
    typeof department === "object" && department !== null
      ? department.name || department.departmentName || department.code || ""
      : department || ""
  )
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function getDepartmentKey(department) {
  const name = normalizeDepartment(department);

  if (name.includes("quarry")) return "quarry";

  if (name.includes("factory") || name.includes("processing")) {
    return "factory";
  }

  if (name.includes("weighbridge") || name.includes("dispatch")) {
    return "weighbridge";
  }

  if (name.includes("finance") || name.includes("account")) {
    return "finance";
  }

  if (name.includes("maintenance") || name.includes("engineering")) {
    return "maintenance";
  }

  return null;
}

/**
 * Department-specific pages.
 * Keep these paths aligned with the routes defined in App.jsx.
 */
const DEPARTMENT_MODULES = {
  quarry: [
    "/production",
    "/inventory",
    "/inventory/materials",
    "/inventory/locations",
    "/inventory/balances",
    "/inventory/ledger",
    "/internal-transfers",
  ],

  factory: [
    "/factory",
    "/production",
    "/inventory",
    "/inventory/materials",
    "/inventory/locations",
    "/inventory/balances",
    "/inventory/ledger",
    "/internal-transfers",
  ],

  weighbridge: [
    "/weighbridge",
    "/dispatches",
    "/trucks",
    "/internal-transfers",
    "/inventory/locations",
  ],

  finance: [
    "/accounting",
    "/expenses",
    "/customers",
    "/sales-orders",
    "/invoices",
    "/payments",
    "/suppliers",
    "/requisitions",
    "/purchase-orders",
    "/grns",
    "/supplier-invoices",
    "/supplier-payments",
  ],

  maintenance: [
    "/trucks",
    "/equipment",
    "/breakdowns",
    "/maintenance",
    "/expenses",
    "/inventory",
    "/inventory/locations",
    "/inventory/balances",
    "/inventory/ledger",
  ],
};

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: "LayoutDashboard",
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    label: "Department Dashboard",
    path: "/department-dashboard",
    icon: "LayoutDashboard",
    allowedRoles: DEPARTMENT_ROLES,
  },
  {
    label: "Administration",
    icon: "Settings",
    allowedRoles: [ROLE.SUPER_ADMIN],
    children: [
      {
        label: "Staff's",
        path: "/users",
        icon: "Users",
        allowedRoles: [ROLE.SUPER_ADMIN],
      },
      {
        label: "Departments",
        path: "/departments",
        icon: "Building2",
        allowedRoles: [ROLE.SUPER_ADMIN],
      },
      {
        label: "Audit Logs",
        path: "/audit-logs",
        icon: "ClipboardList",
        allowedRoles: [ROLE.SUPER_ADMIN],
      },
    ],
  },
  {
    label: "Quarry Operations",
    icon: "Mountain",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Weighbridge",
        path: "/weighbridge",
        icon: "Scale",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Dispatches",
        path: "/dispatches",
        icon: "Truck",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Factory",
        path: "/factory",
        icon: "Factory",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Internal Transfers",
        path: "/internal-transfers",
        icon: "ArrowLeftRight",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Production",
        path: "/production",
        icon: "Factory",
        allowedRoles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Inventory",
    icon: "Boxes",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Inventory Overview",
        path: "/inventory",
        icon: "Package",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Materials",
        path: "/inventory/materials",
        icon: "Layers",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Stock Locations",
        path: "/inventory/locations",
        icon: "MapPin",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Stock Balances",
        path: "/inventory/balances",
        icon: "ChartNoAxesCombined",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Stock Ledger",
        path: "/inventory/ledger",
        icon: "History",
        allowedRoles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Fleet & Maintenance",
    icon: "Truck",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Trucks",
        path: "/trucks",
        icon: "Truck",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Equipment",
        path: "/equipment",
        icon: "Wrench",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Breakdowns",
        path: "/breakdowns",
        icon: "AlertTriangle",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Maintenance",
        path: "/maintenance",
        icon: "Settings",
        allowedRoles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Sales & Customers",
    icon: "ShoppingCart",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Customers",
        path: "/customers",
        icon: "Users",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Sales Orders",
        path: "/sales-orders",
        icon: "ClipboardList",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Invoices",
        path: "/invoices",
        icon: "FileText",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Customer Payments",
        path: "/payments",
        icon: "Wallet",
        allowedRoles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Procurement",
    icon: "ShoppingBasket",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Suppliers",
        path: "/suppliers",
        icon: "Users",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Requisitions",
        path: "/requisitions",
        icon: "ClipboardList",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Purchase Orders",
        path: "/purchase-orders",
        icon: "ShoppingCart",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Goods Received (GRNs)",
        path: "/grns",
        icon: "PackageCheck",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Supplier Invoices",
        path: "/supplier-invoices",
        icon: "FileText",
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Supplier Payments",
        path: "/supplier-payments",
        icon: "Wallet",
        allowedRoles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Finance",
    icon: "Landmark",
    allowedRoles: ALL_ROLES,
    children: [
      {
        label: "Accounting Reports",
        path: "/accounting",
        icon: "ChartNoAxesCombined",
        allowedRoles: [
          ROLE.SUPER_ADMIN,
          ROLE.GENERAL_MANAGER,
          ROLE.DEPARTMENT_MANAGER,
          ROLE.VIEWER_AUDITOR,
        ],
      },
      {
        label: "Expenses",
        path: "/expenses",
        icon: "Receipt",
        allowedRoles: [
          ROLE.SUPER_ADMIN,
          ROLE.GENERAL_MANAGER,
          ROLE.DEPARTMENT_MANAGER,
          ROLE.DATA_ENTRY_OFFICER,
          ROLE.VIEWER_AUDITOR,
        ],
      },
    ],
  },
  {
    label: "My Account",
    path: "/profile",
    icon: "UserRound",
    allowedRoles: ALL_ROLES,
  },
  {
    label: "Correction Requests",
    path: "/corrections",
    icon: "FileCheck",
    allowedRoles: ALL_ROLES,
  },
];

function getRoleVisibleNavigation(role) {
  if (!ALL_ROLES.includes(role)) return [];

  return navigation.reduce((visible, item) => {
    if (!item.allowedRoles.includes(role)) return visible;

    if (item.children) {
      const children = item.children.filter((child) =>
        child.allowedRoles.includes(role)
      );

      if (children.length) {
        visible.push({ ...item, children });
      }

      return visible;
    }

    visible.push(item);
    return visible;
  }, []);
}

/**
 * Gets the sidebar items allowed for this user.
 */
export function getVisibleNavigation(role, department = "") {
  if (!ALL_ROLES.includes(role)) return [];

  // Company-wide management retains its existing role-based access.
  if (MANAGEMENT_ROLES.includes(role)) {
    return getRoleVisibleNavigation(role);
  }

  if (!DEPARTMENT_ROLES.includes(role)) return [];

  const departmentKey = getDepartmentKey(department);
  const allowedPaths = new Set(
    departmentKey ? DEPARTMENT_MODULES[departmentKey] : []
  );

  // Common pages available to department users.
  allowedPaths.add("/department-dashboard");
  allowedPaths.add("/profile");
  allowedPaths.add("/corrections");

  return getRoleVisibleNavigation(role).reduce((visible, item) => {
    if (item.children) {
      const children = item.children.filter((child) =>
        allowedPaths.has(child.path)
      );

      if (children.length) {
        visible.push({ ...item, children });
      }

      return visible;
    }

    if (allowedPaths.has(item.path)) {
      visible.push(item);
    }

    return visible;
  }, []);
}

/**
 * Checks whether the user may open a route directly.
 * Use this in App.jsx route protection as well as the sidebar.
 */
export function canAccessNavigationPath(role, department, path) {
  if (!ALL_ROLES.includes(role)) return false;

  const normalizedPath = String(path || "").split("?")[0].replace(/\/+$/, "") || "/";

  const visibleNavigation = getVisibleNavigation(role, department);

  return visibleNavigation.some((item) => {
    if (item.path === normalizedPath) return true;

    return (
      Array.isArray(item.children) &&
      item.children.some((child) => child.path === normalizedPath)
    );
  });
}

export function getHomePath(role) {
  if (MANAGEMENT_ROLES.includes(role)) return "/";
  if (DEPARTMENT_ROLES.includes(role)) return "/department-dashboard";
  return "/login";
}
