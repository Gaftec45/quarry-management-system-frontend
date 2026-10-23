
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createInitialForm = () => ({
  expenseReference: generateReference("EXP"),
  expenseDate: "",
  category: "fuel",
  description: "",
  amount: "",
  currency: "NGN",
  paymentStatus: "submitted",
  supplierOrPayee: "",
  location: "",
});

const expenseCategories = [
  { value: "fuel", label: "Fuel" },
  { value: "repairs", label: "Repairs" },
  {
    value: "preventive_maintenance",
    label: "Preventive maintenance",
  },
  { value: "labour", label: "Labour" },
  { value: "consumables", label: "Consumables" },
  { value: "spare_parts", label: "Spare parts" },
  { value: "equipment_hire", label: "Equipment hire" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  {
    value: "other_operational_expenses",
    label: "Other operational expenses",
  },
];

const getId = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return String(item._id || item.id || "");
};

const getList = (data, key) => {
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createInitialForm);

  const loadData = async () => {
    const [expensesRes, locationsRes] = await Promise.all([
      api.get("/expenses"),
      api.get("/inventory/locations"),
    ]);

    setExpenses(getList(expensesRes.data, "expenses"));

    const allLocations = getList(
      locationsRes.data,
      "locations"
    );

    setLocations(
      allLocations.filter(
        (location) =>
          location.status === "active" && getId(location)
      )
    );
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        await loadData();
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load expense records."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const refreshData = async () => {
    try {
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The operation succeeded, but the records could not be refreshed."
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.expenseDate) {
      setError("Expense date is required.");
      return;
    }

    const expenseDate = new Date(form.expenseDate);

    if (Number.isNaN(expenseDate.getTime())) {
      setError("Enter a valid expense date.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!form.description.trim()) {
      setError("Expense description is required.");
      return;
    }

    if (!form.category || !form.currency || !form.paymentStatus) {
      setError("Complete all required expense fields.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        expenseReference: form.expenseReference.trim(),
        expenseDate: expenseDate.toISOString(),
        description: form.description.trim(),
        supplierOrPayee: form.supplierOrPayee.trim(),
        amount,
        location: form.location || null,
      };

      await api.post("/expenses", payload);

      setForm(createInitialForm());
      setSuccess("Expense created successfully.");

      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create expense."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (expenseId) => {
    setError("");
    setSuccess("");
    setApprovingId(expenseId);

    try {
      const response = await api.patch(
        `/expenses/${expenseId}/approve`
      );

      setSuccess(response.data.message || "Expense approved.");

      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to approve expense."
      );
    } finally {
      setApprovingId("");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>
            Track operating costs, payment status, and approval workflow.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Record expense</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Reference</label>
                <input
                  name="expenseReference"
                  className="form-control"
                  value={form.expenseReference}
                  readOnly
                  required
                  maxLength={60}
                />
                <small className="text-muted">
                  Generated automatically
                </small>
              </div>

              <div className="col-md-3">
                <label className="form-label">Expense date</label>
                <input
                  name="expenseDate"
                  type="datetime-local"
                  className="form-control"
                  value={form.expenseDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-select"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  {expenseCategories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Amount</label>
                <input
                  name="amount"
                  type="number"
                  className="form-control"
                  value={form.amount}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Currency</label>
                <select
                  name="currency"
                  className="form-select"
                  value={form.currency}
                  onChange={handleChange}
                  required
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  Supplier / payee
                </label>
                <input
                  name="supplierOrPayee"
                  className="form-control"
                  value={form.supplierOrPayee}
                  onChange={handleChange}
                  maxLength={150}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Location</label>
                <select
                  name="location"
                  className="form-select"
                  value={form.location}
                  onChange={handleChange}
                >
                  <option value="">No location selected</option>

                  {locations.map((location) => {
                    const id = getId(location);

                    return (
                      <option key={id} value={id}>
                        {location.code
                          ? `${location.code} - ${location.name || ""}`
                          : location.name || id}
                      </option>
                    );
                  })}
                </select>

                {locations.length === 0 && (
                  <small className="text-muted">
                    No active locations available.
                  </small>
                )}
              </div>

              <div className="col-md-2">
                <label className="form-label">
                  Payment status
                </label>
                <select
                  name="paymentStatus"
                  className="form-select"
                  value={form.paymentStatus}
                  onChange={handleChange}
                  required
                >
                  <option value="submitted">Submitted</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                  maxLength={1000}
                  required
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save expense"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Expense register</h2>

          {loading ? (
            <p>Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted">No expenses found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {expenses.map((item) => (
                    <tr key={item._id}>
                      <td>{item.expenseReference || "—"}</td>

                      <td>
                        {item.expenseDate
                          ? new Date(
                              item.expenseDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        {expenseCategories.find(
                          (category) =>
                            category.value === item.category
                        )?.label || item.category || "—"}
                      </td>

                      <td>
                        {item.location?.name ||
                          item.location?.code ||
                          "—"}
                      </td>

                      <td>
                        {formatAmount(item.amount)}{" "}
                        {item.currency || ""}
                      </td>

                      <td>
                        {item.paymentStatus || "—"}
                      </td>

                      <td>
                        {item.paymentStatus !== "approved" &&
                          item.paymentStatus !== "cancelled" &&
                          item.paymentStatus !== "rejected" &&
                          item.paymentStatus !== "paid" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleApprove(item._id)}
                              disabled={Boolean(approvingId)}
                            >
                              {approvingId === item._id
                                ? "Approving..."
                                : "Approve"}
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
