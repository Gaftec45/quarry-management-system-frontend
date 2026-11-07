
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Users from "./pages/Users";
import AppLayout from "./layouts/AppLayout";
import Departments from "./pages/Departments";
import Trucks from "./pages/Trucks";
import Corrections from "./pages/Corrections";
import AuditLogs from "./pages/AuditLogs";
import Dispatches from "./pages/Dispatches";
import InternalTransfers from "./pages/InternalTransfers";
import InventoryDashboard from "./pages/InventoryDashboard";
import InventoryLocations from "./pages/InventoryLocations";
import Materials from "./pages/Materials";
import StockBalances from "./pages/StockBalances";
import StockLedger from "./pages/StockLedger";
import ProductionRecords from "./pages/ProductionRecords";
import Equipment from "./pages/Equipment";
import Breakdowns from "./pages/Breakdowns";
import Maintenance from "./pages/Maintenance";
import Expenses from "./pages/Expenses";
import Weighbridge from "./pages/Weighbridge";
import FactoryDashboard from "./pages/FactoryDashboard";
import Customers from "./pages/Customers";
import SalesOrders from "./pages/SalesOrders";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Suppliers from "./pages/Suppliers";
import Requisitions from "./pages/Requisitions";
import PurchaseOrders from "./pages/PurchaseOrders";
import GRNs from "./pages/GRNs";
import SupplierInvoices from "./pages/SupplierInvoices";
import SupplierPayments from "./pages/SupplierPayments";
import AccountingReports from "./pages/AccountingReports";
import Dashboard from "./pages/Dashboard";
import DepartmentDashboard from "./pages/DepartmentDashboard";

import { ROLE, navigation } from "./config/navigation";

function PlaceholderPage({ title }) {
  return (
    <section className="empty-state">
      <div className="empty-icon">◇</div>
      <h2>{title}</h2>
      <p>
        This section will be implemented and connected to the
        backend during Phase 1.
      </p>
      <span className="status-pill">Not implemented</span>
    </section>
  );
}

function ProtectedRoute() {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function getCurrentUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem("currentUser") || "null"
    );
  } catch {
    return null;
  }
}


function getHomePath() {
  let user = null;

  try {
    user = JSON.parse(
      sessionStorage.getItem("currentUser") || "null"
    );
  } catch {
    user = null;
  }

  switch (user?.role) {
    case "super_admin":
    case "general_manager":
      return "/dashboard";

    case "department_manager":
    case "data_entry_officer":
    case "viewer_auditor":
      return "/department-dashboard";

    default:
      return "/dashboard";
  }
}


function RoleProtectedRoute({ allowedRoles, children }) {
  const currentUser = getCurrentUser();

  if (!currentUser?.role || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getHomePath()} replace />;
  }

  return children;
}

function Page({ children }) {
  return <div className="page-content">{children}</div>;
}

function ProtectedPage({ path, children }) {
  const allowedRoles = navigation.reduce((roles, item) => {
    if (item.path === path) {
      return item.allowedRoles;
    }

    const child = item.children?.find(
      (entry) => entry.path === path
    );

    if (child) {
      return child.allowedRoles;
    }

    return roles;
  }, null);

  if (!allowedRoles) {
    return <Navigate to={getHomePath()} replace />;
  }

  return (
    <RoleProtectedRoute allowedRoles={allowedRoles}>
      <Page>{children}</Page>
    </RoleProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          sessionStorage.getItem("accessToken") ? (
            <Navigate to={getHomePath()} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Company-wide management dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedPage path="/dashboard">
                <Dashboard />
              </ProtectedPage>
            }
          />

          {/* Department-specific dashboard */}
          <Route
            path="/department-dashboard"
            element={
              <RoleProtectedRoute
                allowedRoles={[
                  "department_manager",
                  "data_entry_officer",
                  "viewer_auditor",
                ]}
              >
                <Page>
                  <DepartmentDashboard />
                </Page>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/accounting"
            element={
              <ProtectedPage path="/accounting">
                <AccountingReports />
              </ProtectedPage>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedPage path="/users">
                <Users />
              </ProtectedPage>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedPage path="/departments">
                <Departments />
              </ProtectedPage>
            }
          />
          <Route
            path="/trucks"
            element={
              <ProtectedPage path="/trucks">
                <Trucks />
              </ProtectedPage>
            }
          />
          <Route
            path="/corrections"
            element={
              <ProtectedPage path="/corrections">
                <Corrections />
              </ProtectedPage>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedPage path="/audit-logs">
                <AuditLogs />
              </ProtectedPage>
            }
          />
          <Route
            path="/dispatches"
            element={
              <ProtectedPage path="/dispatches">
                <Dispatches />
              </ProtectedPage>
            }
          />
          <Route
            path="/weighbridge"
            element={
              <ProtectedPage path="/weighbridge">
                <Weighbridge />
              </ProtectedPage>
            }
          />
          <Route
            path="/factory"
            element={
              <ProtectedPage path="/factory">
                <FactoryDashboard />
              </ProtectedPage>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedPage path="/customers">
                <Customers />
              </ProtectedPage>
            }
          />
          <Route
            path="/sales-orders"
            element={
              <ProtectedPage path="/sales-orders">
                <SalesOrders />
              </ProtectedPage>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedPage path="/invoices">
                <Invoices />
              </ProtectedPage>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedPage path="/payments">
                <Payments />
              </ProtectedPage>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedPage path="/suppliers">
                <Suppliers />
              </ProtectedPage>
            }
          />
          <Route
            path="/requisitions"
            element={
              <ProtectedPage path="/requisitions">
                <Requisitions />
              </ProtectedPage>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedPage path="/purchase-orders">
                <PurchaseOrders />
              </ProtectedPage>
            }
          />
          <Route
            path="/grns"
            element={
              <ProtectedPage path="/grns">
                <GRNs />
              </ProtectedPage>
            }
          />
          <Route
            path="/supplier-invoices"
            element={
              <ProtectedPage path="/supplier-invoices">
                <SupplierInvoices />
              </ProtectedPage>
            }
          />
          <Route
            path="/supplier-payments"
            element={
              <ProtectedPage path="/supplier-payments">
                <SupplierPayments />
              </ProtectedPage>
            }
          />
          <Route
            path="/internal-transfers"
            element={
              <ProtectedPage path="/internal-transfers">
                <InternalTransfers />
              </ProtectedPage>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedPage path="/inventory">
                <InventoryDashboard />
              </ProtectedPage>
            }
          />
          <Route
            path="/inventory/materials"
            element={
              <ProtectedPage path="/inventory/materials">
                <Materials />
              </ProtectedPage>
            }
          />
          <Route
            path="/inventory/locations"
            element={
              <ProtectedPage path="/inventory/locations">
                <InventoryLocations />
              </ProtectedPage>
            }
          />
          <Route
            path="/inventory/balances"
            element={
              <ProtectedPage path="/inventory/balances">
                <StockBalances />
              </ProtectedPage>
            }
          />
          <Route
            path="/inventory/ledger"
            element={
              <ProtectedPage path="/inventory/ledger">
                <StockLedger />
              </ProtectedPage>
            }
          />
          <Route
            path="/production"
            element={
              <ProtectedPage path="/production">
                <ProductionRecords />
              </ProtectedPage>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedPage path="/equipment">
                <Equipment />
              </ProtectedPage>
            }
          />
          <Route
            path="/breakdowns"
            element={
              <ProtectedPage path="/breakdowns">
                <Breakdowns />
              </ProtectedPage>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedPage path="/maintenance">
                <Maintenance />
              </ProtectedPage>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedPage path="/expenses">
                <Expenses />
              </ProtectedPage>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleProtectedRoute allowedRoles={Object.values(ROLE)}>
                <Page>
                  <PlaceholderPage title="My Profile" />
                </Page>
              </RoleProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route  path="*" element={<Navigate to={getHomePath()} replace />}/>
    </Routes>
  );
}
