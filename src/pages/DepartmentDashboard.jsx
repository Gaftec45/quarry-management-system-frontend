
import { useEffect, useState } from "react";
import api from "../lib/api";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString();

const StatCard = ({ title, value, description }) => (
  <div className="col-12 col-md-6 col-xl-3">
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <p className="text-muted mb-2">{title}</p>
        <h3 className="fw-bold mb-1">{value}</h3>
        <small className="text-muted">{description}</small>
      </div>
    </div>
  </div>
);

export default function DepartmentDashboard() {
  const currentUser = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("currentUser") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/analytics/department-dashboard"
        );

        if (active) {
          setDashboard(response.data.dashboard);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load your department dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const departmentName =
    currentUser.department?.name ||
    currentUser.departmentName ||
    "Department";

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
          <p className="text-muted mt-3">
            Loading department dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <h2 className="fw-bold">Department Dashboard</h2>
        <div className="alert alert-danger mt-3">
          {error}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  const production = dashboard?.production || {};
  const equipment = dashboard?.equipment || {};
  const breakdowns = dashboard?.breakdowns || {};

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            {departmentName} Dashboard
          </h2>
          <p className="text-muted mb-0">
            Overview of your department's operations.
          </p>
        </div>

        <span className="badge text-bg-primary px-3 py-2">
          Department Overview
        </span>
      </div>

      <div className="row g-3 mb-4">
        <StatCard
          title="Production Records"
          value={formatNumber(production.totalRecords)}
          description="Posted records in the selected period"
        />
        <StatCard
          title="Total Production"
          value={formatNumber(production.totalQuantity)}
          description="Combined recorded quantity"
        />
        <StatCard
          title="Operating Hours"
          value={formatNumber(production.totalOperatingHours)}
          description="Recorded equipment operating hours"
        />
        <StatCard
          title="Fuel Usage"
          value={formatNumber(production.totalFuelUsage)}
          description="Recorded fuel consumption"
        />
        <StatCard
          title="Department Locations"
          value={formatNumber(dashboard?.department?.locationCount)}
          description="Active inventory locations"
        />
        <StatCard
          title="Equipment"
          value={formatNumber(equipment.totalCount)}
          description="Equipment assigned to department locations"
        />
        <StatCard
          title="Breakdowns"
          value={formatNumber(breakdowns.breakdownCount)}
          description="Breakdowns recorded during the period"
        />
        <StatCard
          title="Downtime Hours"
          value={formatNumber(breakdowns.totalDowntimeHours)}
          description="Hours attributed to equipment breakdowns"
        />
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0">Production Trend</h5>
            </div>

            <div className="card-body">
              {dashboard?.productionTrend?.length ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Records</th>
                        <th className="text-end">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.productionTrend.map((item) => (
                        <tr key={item._id}>
                          <td>{item._id}</td>
                          <td>{formatNumber(item.totalRecords)}</td>
                          <td className="text-end">
                            {formatNumber(item.totalQuantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted mb-0">
                  No production records found for this period.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0">Equipment Status</h5>
            </div>

            <div className="card-body">
              {Object.keys(equipment.byStatus || {}).length ? (
                Object.entries(equipment.byStatus).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="d-flex justify-content-between border-bottom py-3"
                    >
                      <span className="text-capitalize">
                        {status.replaceAll("_", " ")}
                      </span>
                      <strong>{formatNumber(count)}</strong>
                    </div>
                  )
                )
              ) : (
                <p className="text-muted mb-0">
                  No equipment assigned to this department.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
