
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  truckCode: generateReference("TRK"),
  registrationNumber: "",
  truckType: "tipper",
  ownership: "company_owned",
  ownerName: "",
  capacityTons: "",
  driverName: "",
  driverPhone: "",
  notes: "",
});

const truckTypes = [
  ["tipper", "Tipper"],
  ["tractor_head", "Tractor head"],
  ["flatbed", "Flatbed"],
  ["trailer", "Trailer"],
  ["other", "Other"],
];

const statuses = [
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["maintenance", "Maintenance"],
];

function errorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTrucks = useCallback(async () => {
    const params = { limit: 100 };

    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;

    const response = await api.get("/trucks", { params });
    const records = response.data?.data;

    if (!Array.isArray(records)) {
      throw new Error("Unexpected response from the trucks API.");
    }

    setTrucks(records);
  }, [search, statusFilter]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = { limit: 100 };

        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;

        const response = await api.get("/trucks", { params });

        if (!Array.isArray(response.data?.data)) {
          throw new Error("Unexpected response from the trucks API.");
        }

        if (active) setTrucks(response.data.data);
      } catch (err) {
        if (active) {
          setError(errorMessage(err, "Could not load trucks."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [search, statusFilter]);

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(truck) {
    setEditingId(truck._id || truck.id);

    setForm({
      truckCode: truck.truckCode || "",
      registrationNumber: truck.registrationNumber || "",
      truckType: truck.truckType || "tipper",
      ownership: truck.ownership || "company_owned",
      ownerName: truck.ownerName || "",
      capacityTons: String(truck.capacityTons ?? ""),
      driverName: truck.driverName || "",
      driverPhone: truck.driverPhone || "",
      notes: truck.notes || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const capacity = Number(form.capacityTons);

    if (!form.registrationNumber.trim()) {
      setError("Enter the truck's registration number.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(capacity) || capacity < 0.1 || capacity > 1000) {
      setError("Capacity must be between 0.1 and 1,000 tons.");
      setSaving(false);
      return;
    }

    if (
      form.ownership === "external" &&
      !form.ownerName.trim()
    ) {
      setError("Enter the owner or company name for an external truck.");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      ownerName: form.ownership === "external"
        ? form.ownerName.trim()
        : "",
      capacityTons: capacity,
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (editingId) {
        // Do not change the internal truck code when editing.
        delete payload.truckCode;

        await api.patch(`/trucks/${editingId}`, payload);
        setSuccess("Truck details updated successfully.");
      } else {
        await api.post("/trucks", payload);
        setSuccess("Truck registered successfully.");
      }

      resetForm();
      await loadTrucks();
    } catch (err) {
      setError(
        errorMessage(
          err,
          editingId
            ? "Could not update truck."
            : "Could not register truck."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(truck, status) {
    const truckId = truck._id || truck.id;

    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/trucks/${truckId}/status`,
        { status }
      );

      setSuccess(response.data?.message || "Truck status updated.");
      await loadTrucks();
    } catch (err) {
      setError(errorMessage(err, "Could not update truck status."));
    }
  }

  return (
    <section className="trucks-page">
      <div className="trucks-heading">
        <div>
          <p className="users-eyebrow">FLEET / OPERATIONS</p>
          <h2>Truck Registry</h2>
          <p>
            Register trucks and manage fleet information and availability.
          </p>
        </div>

        <button
          type="button"
          className="users-primary-button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setForm(createEmptyForm());
              setEditingId(null);
              setShowForm(true);
              setError("");
              setSuccess("");
            }
          }}
        >
          {showForm ? "Cancel" : "+ Register Truck"}
        </button>
      </div>

      {error && (
        <div className="users-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="users-success" role="status">
          {success}
        </div>
      )}

      <div className="trucks-summary">
        <div className="trucks-summary-card">
          <span>Total listed</span>
          <strong>{trucks.length}</strong>
        </div>

        <div className="trucks-summary-card">
          <span>Active</span>
          <strong>
            {trucks.filter((truck) => truck.status === "active").length}
          </strong>
        </div>

        <div className="trucks-summary-card">
          <span>Maintenance</span>
          <strong>
            {trucks.filter((truck) => truck.status === "maintenance").length}
          </strong>
        </div>
      </div>

      {showForm && (
        <form className="create-user-form" onSubmit={handleSubmit}>
          <div className="create-user-form-heading">
            <h3>{editingId ? "Edit Truck" : "Register Truck"}</h3>
            <p>Fields marked with * are required.</p>
          </div>

          <div className="create-user-grid">
            <div className="create-user-field">
              <label htmlFor="truckCode">Truck code</label>
              <input
                id="truckCode"
                name="truckCode"
                value={form.truckCode}
                readOnly
              />
              <small>Internal code generated automatically.</small>
            </div>

            <div className="create-user-field">
              <label htmlFor="registrationNumber">
                Registration number *
              </label>
              <input
                id="registrationNumber"
                name="registrationNumber"
                value={form.registrationNumber}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="truckType">Truck type *</label>
              <select
                id="truckType"
                name="truckType"
                value={form.truckType}
                onChange={handleChange}
                required
              >
                {truckTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="create-user-field">
              <label htmlFor="ownership">Ownership *</label>
              <select
                id="ownership"
                name="ownership"
                value={form.ownership}
                onChange={handleChange}
                required
              >
                <option value="company_owned">Company owned</option>
                <option value="external">External / third party</option>
              </select>
            </div>

            {form.ownership === "external" && (
              <div className="create-user-field">
                <label htmlFor="ownerName">Owner / company name *</label>
                <input
                  id="ownerName"
                  name="ownerName"
                  value={form.ownerName}
                  onChange={handleChange}
                  maxLength={150}
                  required
                />
              </div>
            )}

            <div className="create-user-field">
              <label htmlFor="capacityTons">Capacity (tons) *</label>
              <input
                id="capacityTons"
                name="capacityTons"
                type="number"
                min="0.1"
                max="1000"
                step="0.1"
                value={form.capacityTons}
                onChange={handleChange}
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="driverName">Driver name</label>
              <input
                id="driverName"
                name="driverName"
                value={form.driverName}
                onChange={handleChange}
                maxLength={120}
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="driverPhone">Driver phone</label>
              <input
                id="driverPhone"
                name="driverPhone"
                type="tel"
                value={form.driverPhone}
                onChange={handleChange}
                maxLength={30}
              />
            </div>

            <div className="create-user-field department-description">
              <label htmlFor="truckNotes">Notes</label>
              <textarea
                id="truckNotes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>

          <div className="create-user-actions">
            <button
              type="button"
              className="users-secondary-button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="users-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Register Truck"}
            </button>
          </div>
        </form>
      )}

      <div className="trucks-toolbar">
        <input
          type="search"
          placeholder="Search registration number..."
          aria-label="Search trucks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter trucks by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="users-message">Loading trucks...</p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Truck code</th>
                <th>Registration</th>
                <th>Type</th>
                <th>Ownership</th>
                <th>Capacity</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {trucks.map((truck) => (
                <tr key={truck._id || truck.id}>
                  <td>
                    <strong>{truck.truckCode || "—"}</strong>
                  </td>

                  <td>
                    <strong>{truck.registrationNumber}</strong>
                  </td>

                  <td>
                    {truckTypes.find(
                      ([value]) => value === truck.truckType
                    )?.[1] || truck.truckType}
                  </td>

                  <td>
                    {truck.ownership === "company_owned"
                      ? "Company owned"
                      : `External${
                          truck.ownerName ? ` — ${truck.ownerName}` : ""
                        }`}
                  </td>

                  <td>{truck.capacityTons} tons</td>

                  <td>
                    {truck.driverName || "—"}
                    {truck.driverPhone && (
                      <small className="truck-driver-phone">
                        {truck.driverPhone}
                      </small>
                    )}
                  </td>

                  <td>
                    <span
                      className={`user-status ${
                        truck.status === "active"
                          ? "user-status-active"
                          : "user-status-inactive"
                      }`}
                    >
                      {statuses.find(
                        ([value]) => value === truck.status
                      )?.[1] || truck.status}
                    </span>
                  </td>

                  <td>
                    <div className="department-actions">
                      <button
                        type="button"
                        className="department-action-button"
                        onClick={() => startEdit(truck)}
                      >
                        Edit
                      </button>

                      <select
                        aria-label={`Change status for ${truck.registrationNumber}`}
                        value={truck.status}
                        onChange={(event) =>
                          changeStatus(truck, event.target.value)
                        }
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}

              {trucks.length === 0 && (
                <tr>
                  <td colSpan="8" className="users-empty">
                    {search || statusFilter
                      ? "No trucks match your filters."
                      : "No trucks registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
