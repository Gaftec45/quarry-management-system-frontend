
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  code: generateReference("LOC"),
  name: "",
  type: "stockpile",
  status: "active",
  address: "",
  notes: "",
});

function InventoryLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const loadLocations = async () => {
    const response = await api.get("/inventory/locations");
    setLocations(response.data.locations || []);
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/inventory/locations");

        if (active) {
          setLocations(response.data.locations || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load locations."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsCreating(true);

    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      };

      const response = await api.post(
        "/inventory/locations",
        payload
      );

      setSuccess(
        response.data.message || "Location created successfully."
      );

      setForm(createEmptyForm());

      await loadLocations();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create location."
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventory Locations</h1>
          <p>
            Physical storage and quarry nodes recognised by the
            stock system.
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
          <h2 className="h5 mb-3">Create location</h2>

          <form onSubmit={handleCreate}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label" htmlFor="locationCode">
                  Location code
                </label>
                <input
                  id="locationCode"
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
                <label className="form-label" htmlFor="locationName">
                  Name
                </label>
                <input
                  id="locationName"
                  className="form-control"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="locationType">
                  Type
                </label>
                <select
                  id="locationType"
                  className="form-select"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                >
                  <option value="quarry">Quarry</option>
                  <option value="factory">Factory</option>
                  <option value="stockpile">Stockpile</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-md-2">
                <label
                  className="form-label"
                  htmlFor="locationStatus"
                >
                  Status
                </label>
                <select
                  id="locationStatus"
                  className="form-select"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-md-2 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isCreating}
                >
                  {isCreating ? "Saving..." : "Create"}
                </button>
              </div>

              <div className="col-12">
                <label
                  className="form-label"
                  htmlFor="locationAddress"
                >
                  Address
                </label>
                <input
                  id="locationAddress"
                  className="form-control"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <label
                  className="form-label"
                  htmlFor="locationNotes"
                >
                  Notes
                </label>
                <textarea
                  id="locationNotes"
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Location register</h2>

          {loading ? (
            <p>Loading locations...</p>
          ) : locations.length === 0 ? (
            <p className="text-muted">
              No inventory locations found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Address</th>
                  </tr>
                </thead>

                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id || location._id}>
                      <td>{location.code}</td>
                      <td>{location.name}</td>
                      <td>{location.type}</td>
                      <td>
                        <span
                          className={`badge ${
                            location.status === "active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {location.status}
                        </span>
                      </td>
                      <td>{location.address || "—"}</td>
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

export default InventoryLocations;