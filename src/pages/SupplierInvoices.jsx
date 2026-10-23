
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createInitialForm = () => ({
  invoiceNumber: generateReference("INV"),
  supplier: "",
  purchaseOrder: "",
  total: 0,
  currency: "USD",
});

const getList = (data, key) => {
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/procurement/supplier-invoices");
      setInvoices(getList(response.data, "invoices"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load supplier invoices."
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

    if (!form.invoiceNumber.trim()) {
      setError("Invoice number is required.");
      return;
    }

    if (!form.supplier.trim()) {
      setError("Supplier ID is required.");
      return;
    }

    if (!form.purchaseOrder.trim()) {
      setError("Purchase order ID is required.");
      return;
    }

    if (
      !Number.isFinite(form.total) ||
      form.total <= 0
    ) {
      setError("Invoice total must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/procurement/supplier-invoices", {
        ...form,
        invoiceNumber: form.invoiceNumber.trim(),
        supplier: form.supplier.trim(),
        purchaseOrder: form.purchaseOrder.trim(),
        total: Number(form.total),
      });

      setForm(createInitialForm());
      setSuccess("Supplier invoice recorded successfully.");

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create supplier invoice."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Record supplier invoice</h2>

          <form onSubmit={submit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Invoice number</label>
              <input
                className="form-control"
                value={form.invoiceNumber}
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
              <label className="form-label">Purchase order ID</label>
              <input
                className="form-control"
                placeholder="Enter purchase order ID"
                value={form.purchaseOrder}
                onChange={(e) =>
                  updateField("purchaseOrder", e.target.value)
                }
                required
              />
            </div>

            <div className="col-md-4">
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
              <label className="form-label">Invoice total</label>
              <input
                type="number"
                className="form-control"
                min="0.01"
                step="any"
                value={form.total}
                onChange={(e) =>
                  updateField(
                    "total",
                    e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                  )
                }
                required
              />
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save invoice"}
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
          <h2 className="h5 mb-3">Supplier invoice list</h2>

          {loading ? (
            <p>Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted mb-0">
              No supplier invoices found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>

                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice._id}>
                      <td>{invoice.invoiceNumber || "—"}</td>

                      <td>
                        {invoice.supplier?.name ||
                          invoice.supplier?.supplierName ||
                          (typeof invoice.supplier === "string"
                            ? invoice.supplier
                            : "—")}
                      </td>

                      <td>
                        <span className="badge text-bg-secondary">
                          {invoice.status || "—"}
                        </span>
                      </td>

                      <td>
                        {Number(
                          invoice.outstandingBalance ?? 0
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {invoice.currency || ""}
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
