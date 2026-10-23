
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  supplierCode: generateReference("SUP"),
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  category: "general",
  paymentTerms: "Net 30",
});

function getSuppliers(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.suppliers)) return data.suppliers;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSuppliers = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/procurement/suppliers");
      setSuppliers(getSuppliers(response));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        supplierCode: form.supplierCode.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        paymentTerms: form.paymentTerms.trim(),
      };

      await api.post("/procurement/suppliers", payload);

      setForm(createEmptyForm());
      setSuccess("Supplier saved successfully.");

      await loadSuppliers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save supplier."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Add supplier</h2>

          <form className="row g-3" onSubmit={submit}>
            <div className="col-md-3">
              <label className="form-label">Supplier code</label>
              <input
                className="form-control"
                name="supplierCode"
                value={form.supplierCode}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-3">
              <label className="form-label">Supplier name *</label>
              <input
                className="form-control"
                name="name"
                placeholder="Supplier or company name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Contact person</label>
              <input
                className="form-control"
                name="contactPerson"
                placeholder="Contact person"
                value={form.contactPerson}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Phone</label>
              <input
                className="form-control"
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Address</label>
              <input
                className="form-control"
                name="address"
                placeholder="Supplier address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="general">General</option>
                <option value="raw_materials">Raw materials</option>
                <option value="spare_parts">Spare parts</option>
                <option value="fuel">Fuel</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Payment terms</label>
              <input
                className="form-control"
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={handleChange}
              />
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save supplier"}
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
          <h2 className="h5 mb-3">Supplier list</h2>

          {loading ? (
            <p>Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-muted mb-0">
              No suppliers found. Add your first supplier above.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Contact person</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id || supplier.id || supplier.supplierCode}>
                      <td>{supplier.supplierCode || "—"}</td>
                      <td>{supplier.name || "—"}</td>
                      <td className="text-capitalize">
                        {supplier.category?.replaceAll("_", " ") || "—"}
                      </td>
                      <td>{supplier.contactPerson || "—"}</td>
                      <td>{supplier.phone || "—"}</td>
                      <td>
                        <span className="badge text-bg-secondary">
                          {supplier.status || "—"}
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
