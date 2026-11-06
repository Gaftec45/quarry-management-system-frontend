
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";

const getLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const today = getLocalDate(new Date());

const monthStart = getLocalDate(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

const initialMetrics = {
  production: {
    totalRecords: 0,
    totalQuantity: 0,
    totalOperatingHours: 0,
    totalDowntimeHours: 0,
    totalFuelUsage: 0,
  },
  productionTrend: [],
  inventoryByUnit: [],
  weighbridge: {
    ticketCount: 0,
    totalNetWeight: 0,
  },
  expenses: {
    expenseCount: 0,
    totalsByCurrency: [],
  },
  sales: {
    orderCount: 0,
  },
  equipment: {
    totalCount: 0,
  },
  breakdowns: {
    breakdownCount: 0,
    totalDowntimeHours: 0,
  },
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const formatCurrencyTotals = (totalsByCurrency = []) => {
  if (totalsByCurrency.length === 0) return "No expenses";

  return totalsByCurrency
    .map(
      ({ currency, totalAmount }) =>
        `${currency} ${formatNumber(totalAmount)}`
    )
    .join(" · ");
};

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Format YYYY-MM-DD without shifting the date because of UTC conversion.
const formatTrendDate = (dateString) => {
  if (!dateString) return "Unknown date";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

function MetricCard({ label, value, detail, icon }) {
  return (
    <article className="card h-100 border-0 shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <p className="text-secondary small mb-2">{label}</p>
            <h3 className="fw-bold mb-2">{value}</h3>
            <p className="text-secondary small mb-0">{detail}</p>
          </div>

          <span
            className="rounded-3 bg-light p-3"
            aria-hidden="true"
            style={{ fontSize: "1.2rem" }}
          >
            {icon}
          </span>
        </div>
      </div>
    </article>
  );
}

function ProductionTrendChart({ data = [] }) {
  const maxQuantity = Math.max(
    0,
    ...data.map((item) => Number(item.totalQuantity) || 0)
  );

  return (
    <section className="card border-0 shadow-sm mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div>
            <h3 className="h5 fw-bold mb-1">Daily production trend</h3>
            <p className="text-secondary small mb-0">
              Posted production grouped by day for the selected period.
            </p>
          </div>

          <span className="badge text-bg-light border">
            {data.length} production {data.length === 1 ? "day" : "days"}
          </span>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-5">
            <div className="fs-2 mb-2" aria-hidden="true">
              📊
            </div>
            <h4 className="h6 fw-semibold">No production data</h4>
            <p className="text-secondary small mb-0">
              No posted production records were found for this date range.
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {data.map((item, index) => {
              const quantity = Number(item.totalQuantity) || 0;

              const percentage =
                maxQuantity > 0
                  ? Math.min(
                      100,
                      Math.max(0, (quantity / maxQuantity) * 100)
                    )
                  : 0;

              return (
                <div key={item._id || `production-${index}`}>
                  <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
                    <span className="small fw-semibold">
                      {formatTrendDate(item._id)}
                    </span>

                    <span className="small fw-bold text-nowrap">
                      {formatNumber(quantity)}
                    </span>
                  </div>

                  <div
                    className="progress"
                    style={{ height: "14px" }}
                    role="progressbar"
                    aria-label={`Production on ${item._id || "unknown date"}`}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-bar bg-primary rounded"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="text-secondary mt-1">
                    <small>
                      {formatNumber(item.totalRecords)} posted{" "}
                      {Number(item.totalRecords) === 1 ? "record" : "records"}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-secondary small mt-4 mb-0">
          Bar lengths compare daily production quantities within this date
          range. Quantities use the unit configured in your production
          records.
        </p>
      </div>
    </section>
  );
}


function ExpenseBreakdownChart({ totalsByCurrency = [] }) {
  const data = totalsByCurrency
    .filter((item) => Number.isFinite(Number(item.totalAmount)))
    .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));

  const maxAmount = Math.max(
    0,
    ...data.map((item) => Number(item.totalAmount))
  );

  return (
    <section className="card border-0 shadow-sm mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div>
            <h3 className="h5 fw-bold mb-1">Operational expense breakdown</h3>
            <p className="text-secondary small mb-0">
              Recorded expenses grouped by currency for the selected period.
            </p>
          </div>

          <span className="badge text-bg-light border">
            {data.length} {data.length === 1 ? "currency" : "currencies"}
          </span>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-4">
            <div className="fs-2 mb-2" aria-hidden="true">
              💳
            </div>
            <h4 className="h6 fw-semibold">No expense data</h4>
            <p className="text-secondary small mb-0">
              No expense totals are available for this period.
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {data.map((item, index) => {
              const amount = Number(item.totalAmount);
              const percentage =
                maxAmount > 0
                  ? Math.min(100, Math.max(0, (amount / maxAmount) * 100))
                  : 0;

              return (
                <div key={item.currency || `currency-${index}`}>
                  <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
                    <span className="fw-semibold">
                      {item.currency || "Unspecified"}
                    </span>
                    <span className="fw-bold text-nowrap">
                      {formatNumber(amount)}
                    </span>
                  </div>

                  <div
                    className="progress"
                    style={{ height: "14px" }}
                    role="progressbar"
                    aria-label={`${item.currency || "Unspecified"} expense total`}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-bar bg-success rounded"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-secondary small mt-4 mb-0">
          Amounts remain separated by currency. Bar lengths compare the
          numerical totals only; they do not represent equivalent values
          across different currencies.
        </p>
      </div>
    </section>
  );
}


function BreakdownAnalytics({ breakdowns }) {
  const statuses = breakdowns.byStatus || [];
  const categories = breakdowns.byCategory || [];

  const statusLabels = {
    reported: "Reported",
    under_repair: "Under repair",
    resolved: "Resolved",
    closed: "Closed",
  };

  const categoryLabels = {
    hydraulic: "Hydraulic",
    electrical: "Electrical",
    engine: "Engine",
    structural: "Structural",
    other: "Other",
  };

  const maxStatusCount = Math.max(
    0,
    ...statuses.map((item) => Number(item.count) || 0)
  );

  return (
    <section className="card border-0 shadow-sm mb-4">
      <div className="card-body p-4">
        <h3 className="h5 fw-bold mb-1">Equipment downtime analytics</h3>
        <p className="text-secondary small mb-4">
          Breakdown frequency, recorded downtime, repair status and causes.
        </p>

        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="rounded-3 bg-light p-3 h-100">
              <p className="text-secondary small mb-2">Total breakdowns</p>
              <h3 className="fw-bold mb-0">
                {formatNumber(breakdowns.breakdownCount)}
              </h3>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="rounded-3 bg-light p-3 h-100">
              <p className="text-secondary small mb-2">Recorded downtime</p>
              <h3 className="fw-bold mb-0">
                {formatNumber(breakdowns.totalDowntimeHours)} hrs
              </h3>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="rounded-3 bg-light p-3 h-100">
              <p className="text-secondary small mb-2">
                Average downtime per breakdown
              </p>
              <h3 className="fw-bold mb-0">
                {formatNumber(breakdowns.averageDowntimeHours)} hrs
              </h3>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <h4 className="h6 fw-bold mb-3">Breakdowns by status</h4>

            {statuses.length === 0 ? (
              <p className="text-secondary small">
                No breakdown status data for this period.
              </p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {statuses.map((item) => {
                  const percentage =
                    maxStatusCount > 0
                      ? (item.count / maxStatusCount) * 100
                      : 0;

                  return (
                    <div key={item.status}>
                      <div className="d-flex justify-content-between gap-2 mb-1">
                        <span className="small">
                          {statusLabels[item.status] || item.status}
                        </span>
                        <strong className="small">
                          {formatNumber(item.count)}
                        </strong>
                      </div>

                      <div
                        className="progress"
                        style={{ height: "10px" }}
                        role="progressbar"
                        aria-label={`${statusLabels[item.status] || item.status} breakdowns`}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <small className="text-secondary">
                        {formatNumber(item.downtimeHours)} recorded downtime
                        hours
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="col-12 col-lg-6">
            <h4 className="h6 fw-bold mb-3">Breakdowns by category</h4>

            {categories.length === 0 ? (
              <p className="text-secondary small">
                No breakdown category data for this period.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Count</th>
                      <th scope="col">Downtime (hrs)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categories.map((item) => (
                      <tr key={item.category}>
                        <td>
                          {categoryLabels[item.category] || item.category}
                        </td>
                        <td>{formatNumber(item.count)}</td>
                        <td>{formatNumber(item.downtimeHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <p className="text-secondary small mt-3 mb-0">
          Metrics cover breakdowns reported during the selected date range.
          Downtime is based on the value recorded in each breakdown.
        </p>
      </div>
    </section>
  );
}



export default function Dashboard() {
  // Editable dates stay local until the user applies the filters.
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [appliedStartDate, setAppliedStartDate] = useState(monthStart);
  const [appliedEndDate, setAppliedEndDate] = useState(today);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (
      !appliedStartDate ||
      !appliedEndDate ||
      appliedStartDate > appliedEndDate ||
      appliedEndDate > today
    ) {
      setError("Select a valid date range.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/analytics/dashboard", {
        params: {
          startDate: appliedStartDate,
          endDate: appliedEndDate,
        },
      });

      const result = response.data;

      if (!result?.success || !result.dashboard) {
        throw new Error(
          result?.message || "Unable to load management analytics."
        );
      }

      setMetrics({
        ...initialMetrics,
        ...result.dashboard,
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appliedStartDate, appliedEndDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const production = metrics.production || initialMetrics.production;
  const productionTrend = metrics.productionTrend || [];
  const inventory = metrics.inventoryByUnit || [];
  const weighbridge = metrics.weighbridge || initialMetrics.weighbridge;
  const expenses = metrics.expenses || initialMetrics.expenses;
  const sales = metrics.sales || initialMetrics.sales;
  const equipment = metrics.equipment || initialMetrics.equipment;
  const breakdowns = metrics.breakdowns || initialMetrics.breakdowns;

  const exportDashboardCsv = () => {
    const rows = [
      ["Report", "QuarryOS Management Dashboard"],
      ["Start date", appliedStartDate],
      ["End date", appliedEndDate],
      [],
      ["Section", "Metric", "Value", "Unit"],
      ["Production", "Posted production records", production.totalRecords, "records"],
      ["Production", "Production quantity", production.totalQuantity, "configured production unit"],
      ["Production", "Operating hours", production.totalOperatingHours, "hours"],
      ["Production", "Production downtime", production.totalDowntimeHours, "hours"],
      ["Production", "Fuel usage", production.totalFuelUsage, "configured fuel unit"],
      ["Weighbridge", "Ticket count", weighbridge.ticketCount, "tickets"],
      ["Weighbridge", "Total net weight", weighbridge.totalNetWeight, "configured weight unit"],
      ["Sales", "Sales orders", sales.orderCount, "orders"],
      ["Expenses", "Expense record count", expenses.expenseCount, "records"],
      ...expenses.totalsByCurrency.map((item) => [
        "Expenses",
        "Total amount",
        item.totalAmount,
        item.currency || "Unspecified currency",
      ]),
      ["Equipment", "Registered equipment", equipment.totalCount, "items"],
      ["Breakdowns", "Breakdown count", breakdowns.breakdownCount, "breakdowns"],
      ["Breakdowns", "Recorded downtime", breakdowns.totalDowntimeHours, "hours"],
      ["Breakdowns", "Average downtime per breakdown", breakdowns.averageDowntimeHours, "hours"],
      [],
      ["Inventory", "Unit", "Total quantity", "Material-location balances"],
      ...inventory.map((item) => [
        "Inventory",
        item._id || "Unspecified",
        item.totalQuantity,
        item.materialLocationCount,
      ]),
      [],
      ["Production trend", "Date", "Total quantity", "Posted records"],
      ...productionTrend.map((item) => [
        "Production trend",
        item._id || "Unknown date",
        item.totalQuantity,
        item.totalRecords,
      ]),
      [],
      ["Breakdowns by status", "Status", "Count", "Downtime hours"],
      ...(breakdowns.byStatus || []).map((item) => [
        "Breakdowns by status",
        item.status || "Unspecified",
        item.count,
        item.downtimeHours,
      ]),
      [],
      ["Breakdowns by category", "Category", "Count", "Downtime hours"],
      ...(breakdowns.byCategory || []).map((item) => [
        "Breakdowns by category",
        item.category || "Unspecified",
        item.count,
        item.downtimeHours,
      ]),
    ];

    downloadCsv(
      `quarryos-dashboard-${appliedStartDate}-to-${appliedEndDate}.csv`,
      rows
    );
  };

  return (
    <div className="page-content">
      <section className="welcome-panel mb-4">
        <div>
          <span className="eyebrow">MANAGEMENT INTELLIGENCE</span>
          <h2>Royal Mining & Chemical</h2>
          <p>
            Monitor production, inventory, weighbridge activity, operating
            expenses and equipment performance from one workspace.
          </p>
        </div>

        <div className="welcome-symbol">Q</div>
      </section>

      <section className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1">Operational overview</h2>
          <p className="text-secondary mb-0">
            Metrics from your quarry database.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={exportDashboardCsv}
            disabled={loading || Boolean(error)}
          >
            Export CSV
          </button>

          <span className="badge text-bg-light border py-2 px-3">
            {loading
            ? "Updating..."
            : error
              ? "Update failed"
              : "Connected to API"}
          </span>
        </div>
      </section>

      <section className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form
            className="row g-3 align-items-end"
            onSubmit={(event) => {
              event.preventDefault();

              if (
                !startDate ||
                !endDate ||
                startDate > endDate ||
                endDate > today
              ) {
                setError("Select a valid date range.");
                return;
              }

              setAppliedStartDate(startDate);
              setAppliedEndDate(endDate);
            }}
          >
            <div className="col-12 col-sm-5 col-lg-4">
              <label htmlFor="analytics-start-date" className="form-label">
                Start date
              </label>

              <input
                id="analytics-start-date"
                type="date"
                className="form-control"
                value={startDate}
                max={endDate || today}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>

            <div className="col-12 col-sm-5 col-lg-4">
              <label htmlFor="analytics-end-date" className="form-label">
                End date
              </label>

              <input
                id="analytics-end-date"
                type="date"
                className="form-control"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply filters"}
              </button>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                disabled={loading}
                onClick={() => {
                  setStartDate(monthStart);
                  setEndDate(today);
                  setError("");
                  setAppliedStartDate(monthStart);
                  setAppliedEndDate(today);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Dashboard error:</strong> {error}

          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={loadDashboard}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="alert alert-info" role="status">
          Loading management analytics...
        </div>
      )}

      <section className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Production quantity"
            value={formatNumber(production.totalQuantity)}
            detail={`${formatNumber(production.totalRecords)} posted records`}
            icon="⛏️"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Operating hours"
            value={formatNumber(production.totalOperatingHours)}
            detail={`${formatNumber(production.totalDowntimeHours)} production downtime hours`}
            icon="⏱️"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Weighbridge tickets"
            value={formatNumber(weighbridge.ticketCount)}
            detail={`Net weight: ${formatNumber(weighbridge.totalNetWeight)}`}
            icon="⚖️"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Sales orders"
            value={formatNumber(sales.orderCount)}
            detail="Orders created in the selected period"
            icon="📋"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Operational expenses"
            value={formatCurrencyTotals(expenses.totalsByCurrency)}
            detail={`${formatNumber(expenses.expenseCount)} expense records`}
            icon="💳"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Registered equipment"
            value={formatNumber(equipment.totalCount)}
            detail="Total equipment records"
            icon="🚜"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Equipment breakdowns"
            value={formatNumber(breakdowns.breakdownCount)}
            detail={`${formatNumber(breakdowns.totalDowntimeHours)} downtime hours`}
            icon="🔧"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <MetricCard
            label="Fuel usage"
            value={formatNumber(production.totalFuelUsage)}
            detail="Recorded production fuel usage"
            icon="⛽"
          />
        </div>
      </section>

      <ProductionTrendChart data={productionTrend} />
      <ExpenseBreakdownChart totalsByCurrency={expenses.totalsByCurrency} />
      <BreakdownAnalytics breakdowns={breakdowns} />

      <section className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h3 className="h5 fw-bold mb-1">Current inventory</h3>
              <p className="text-secondary small mb-0">
                Stock balances grouped by unit of measurement.
              </p>
            </div>

            <span className="badge text-bg-light border">
              Current snapshot
            </span>
          </div>

          {inventory.length === 0 ? (
            <p className="text-secondary mb-0">
              No inventory balances are currently recorded.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Unit</th>
                    <th scope="col">Total quantity</th>
                    <th scope="col">Material-location balances</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item, index) => (
                    <tr key={item._id || `unit-${index}`}>
                      <td className="text-uppercase fw-semibold">
                        {item._id || "Unspecified"}
                      </td>
                      <td>{formatNumber(item.totalQuantity)}</td>
                      <td>{formatNumber(item.materialLocationCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-secondary small mt-3 mb-0">
            Inventory is a current snapshot; changing the date filter does not
            change these balances.
          </p>
        </div>
      </section>

      <section className="notice-panel">
        <div className="notice-icon">i</div>
        <div>
          <h3>Reporting notes</h3>
          <p>
            Production and activity metrics use the selected date range.
            Inventory shows current stock. Production quantity, weighbridge
            net weight and inventory quantities may use different units and
            should not be added together. Verify financial figures against the
            accounting records before using them for financial decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
