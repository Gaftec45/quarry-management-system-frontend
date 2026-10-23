
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  code: generateReference("EQP"),
  name: "",
  category: "excavator",
  manufacturer: "",
  model: "",
  status: "active",
  assignedLocation: "",
  currentOperatingHours: "0",
  maintenanceIntervalHours: "0",
  notes: "",
});

const getId = (value) => value?.id ?? value?._id ?? "";

export default function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createEmptyForm);

  const loadData = async () => {
    const [equipmentRes, locationRes] = await Promise.all([
      api.get("/equipment"),
      api.get("/inventory/locations"),
    ]);

    setEquipment(equipmentRes.data.equipment || []);
    setLocations(
      (locationRes.data.locations || []).filter(
        (location) => location.status === "active"
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
              "Unable to load equipment records."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        notes: form.notes.trim(),
        assignedLocation: form.assignedLocation || undefined,
        currentOperatingHours: Number(
          form.currentOperatingHours || 0
        ),
        maintenanceIntervalHours: Number(
          form.maintenanceIntervalHours || 0
        ),
      };

      const response = await api.post("/equipment", payload);

      setSuccess(
        response.data.message || "Equipment added successfully."
      );

      setForm(createEmptyForm());

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create equipment."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Equipment</h1>
          <p>
            Track quarry machinery, assignment, and maintenance
            intervals.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Add equipment</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-2">
                <label className="form-label" htmlFor="equipmentCode">
                  Equipment code
                </label>
                <input
                  id="equipmentCode"
                  className="form-control"
                  value={form.code}
                  readOnly
                  required
                />
                <small className="text-muted">
                  Generated automatically
                </small>
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="equipmentName">
                  Name
                </label>
                <input
                  id="equipmentName"
                  className="form-control"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-2">
                <label
                  className="form-label"
                  htmlFor="equipmentCategory"
                >
                  Category
                </label>
                <select
                  id="equipmentCategory"
                  className="form-select"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="excavator">Excavator</option>
                  <option value="wheel_loader">Wheel Loader</option>
                  <option value="crusher">Crusher</option>
                  <option value="generator">Generator</option>
                  <option value="drilling">Drilling</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-md-2">
                <label
                  className="form-label"
                  htmlFor="equipmentManufacturer"
                >
                  Manufacturer
                </label>
                <input
                  id="equipmentManufacturer"
                  className="form-control"
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      manufacturer: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="equipmentModel">
                  Model
                </label>
                <input
                  id="equipmentModel"
                  className="form-control"
                  value={form.model}
                  onChange={(e) =>
                    setForm({ ...form, model: e.target.value })
                  }
                />
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="assignedLocation"
                >
                  Assigned location
                </label>
                <select
                  id="assignedLocation"
                  className="form-select"
                  value={form.assignedLocation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assignedLocation: e.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {locations.map((location) => (
                    <option
                      key={getId(location)}
                      value={getId(location)}
                    >
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="equipmentStatus"
                >
                  Status
                </label>
                <select
                  id="equipmentStatus"
                  className="form-select"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="under_maintenance">
                    Under maintenance
                  </option>
                  <option value="breakdown">Breakdown</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="operatingHours"
                >
                  Operating hours
                </label>
                <input
                  id="operatingHours"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.currentOperatingHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currentOperatingHours: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="maintenanceInterval"
                >
                  Maintenance interval (hours)
                </label>
                <input
                  id="maintenanceInterval"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.maintenanceIntervalHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maintenanceIntervalHours: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="equipmentNotes">
                  Notes
                </label>
                <textarea
                  id="equipmentNotes"
                  className="form-control"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Create equipment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Equipment register</h2>

          {loading ? (
            <p>Loading equipment...</p>
          ) : equipment.length === 0 ? (
            <p className="text-muted">No equipment found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Hours</th>
                  </tr>
                </thead>

                <tbody>
                  {equipment.map((item) => (
                    <tr key={getId(item)}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.assignedLocation?.name || "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.currentOperatingHours ?? 0}</td>
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
