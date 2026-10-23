
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  customerReference: generateReference("CUS"),
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  billingAddress: "",
  customerType: "business",
});

function getCustomers(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/sales/customers");
      setCustomers(getCustomers(response));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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

    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        customerReference: form.customerReference.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        billingAddress: form.billingAddress.trim(),
      };

      await api.post("/sales/customers", payload);

      setForm(createEmptyForm());
      setSuccess("Customer saved successfully.");

      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Add customer</h2>

          <form className="row g-3" onSubmit={submit}>
            <div className="col-md-3">
              <label className="form-label">Customer reference</label>
              <input
                className="form-control"
                name="customerReference"
                value={form.customerReference}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-3">
              <label className="form-label">Customer name *</label>
              <input
                className="form-control"
                name="name"
                placeholder="Customer or company name"
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
              <label className="form-label">Billing address</label>
              <input
                className="form-control"
                name="billingAddress"
                placeholder="Billing address"
                value={form.billingAddress}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Customer type</label>
              <select
                className="form-select"
                name="customerType"
                value={form.customerType}
                onChange={handleChange}
              >
                <option value="business">Business</option>
                <option value="individual">Individual</option>
                <option value="contractor">Contractor</option>
                <option value="government">Government</option>
              </select>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save customer"}
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
          <h2 className="h5 mb-3">Customer list</h2>

          {loading ? (
            <p>Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="text-muted mb-0">
              No customers found. Add your first customer above.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Contact person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id || customer.id || customer.customerReference}>
                      <td>{customer.customerReference || "—"}</td>
                      <td>{customer.name || "—"}</td>
                      <td className="text-capitalize">
                        {customer.customerType || "—"}
                      </td>
                      <td>{customer.contactPerson || "—"}</td>
                      <td>{customer.phone || "—"}</td>
                      <td>{customer.email || "—"}</td>
                      <td>
                        <span className="badge text-bg-secondary">
                          {customer.status || "—"}
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
