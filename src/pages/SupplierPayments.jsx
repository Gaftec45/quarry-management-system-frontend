
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createInitialForm = () => ({
  paymentReference: generateReference("PAY"),
  supplier: "",
  invoice: "",
  amount: 0,
  currency: "USD",
  paymentMethod: "bank_transfer",
});

const getList = (data, key) => {
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

export default function SupplierPayments() {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/procurement/supplier-payments");
      setPayments(getList(response.data, "payments"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load supplier payments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.paymentReference.trim()) {
      setError("Payment reference is required.");
      return;
    }

    if (!form.supplier.trim()) {
      setError("Supplier ID is required.");
      return;
    }

    if (!form.invoice.trim()) {
      setError("Supplier invoice ID is required.");
      return;
    }

    if (!Number.isFinite(form.amount) || form.amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (!form.currency || !form.paymentMethod) {
      setError("Select a currency and payment method.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/procurement/supplier-payments", {
        ...form,
        paymentReference: form.paymentReference.trim(),
        supplier: form.supplier.trim(),
        invoice: form.invoice.trim(),
        amount: Number(form.amount),
      });

      setForm(createInitialForm());
      setSuccess("Supplier payment recorded successfully.");

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to record payment."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Record supplier payment</h2>

          <form onSubmit={submit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Payment reference</label>
              <input
                className="form-control"
                value={form.paymentReference}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-4">
              <label className="form-label">Supplier ID</label>
              <input
                className="form-control"
                placeholder="Enter supplier ID"
                value={form.supplier}
                onChange={(e) =>
                  updateField("supplier", e.target.value)
                }
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Supplier invoice ID</label>
              <input
                className="form-control"
                placeholder="Enter invoice ID"
                value={form.invoice}
                onChange={(e) =>
                  updateField("invoice", e.target.value)
                }
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-control"
                min="0.01"
                step="any"
                value={form.amount}
                onChange={(e) =>
                  updateField(
                    "amount",
                    e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                  )
                }
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) =>
                  updateField("currency", e.target.value)
                }
                required
              >
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="KES">KES</option>
                <option value="NGN">NGN</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Payment method</label>
              <select
                className="form-select"
                value={form.paymentMethod}
                onChange={(e) =>
                  updateField("paymentMethod", e.target.value)
                }
                required
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Record payment"}
              </button>
            </div>
          </form>
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

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Supplier payment log</h2>

          {loading ? (
            <p>Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-muted mb-0">
              No supplier payments found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Supplier</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>{payment.paymentReference || "—"}</td>

                      <td>
                        {payment.supplier?.name ||
                          payment.supplier?.supplierName ||
                          (typeof payment.supplier === "string"
                            ? payment.supplier
                            : "—")}
                      </td>

                      <td>
                        {Number(payment.amount || 0).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        {payment.currency || ""}
                      </td>

                      <td>
                        {String(
                          payment.paymentMethod || "—"
                        ).replaceAll("_", " ")}
                      </td>

                      <td>
                        <span className="badge text-bg-secondary">
                          {payment.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
