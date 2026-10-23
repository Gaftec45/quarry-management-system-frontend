
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  ticketNumber: generateReference("WBT"),
  truckId: "",
  driverName: "",
  material: "",
  grossWeight: "",
  tareWeight: "",
  source: "",
  destination: "",
  notes: "",
});

const getList = (response, keys = []) => {
  const data = response?.data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

export default function Weighbridge() {
  const [tickets, setTickets] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(createEmptyForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        ticketsRes,
        trucksRes,
        materialsRes,
        locationsRes,
      ] = await Promise.all([
        api.get("/weighbridge"),
        api.get("/trucks", { params: { limit: 100 } }),
        api.get("/inventory/materials"),
        api.get("/inventory/locations"),
      ]);

      const truckList = getList(trucksRes, ["trucks"]);
      const materialList = getList(materialsRes, ["materials"]);
      const locationList = getList(locationsRes, ["locations"]);

      setTickets(getList(ticketsRes, ["tickets"]));

      setTrucks(
        truckList.filter((truck) => truck.status === "active")
      );

      setMaterials(
        materialList.filter((material) => material.isActive === true)
      );

      setLocations(
        locationList.filter((location) => location.status === "active")
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load weighbridge, materials, and locations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const gross = Number(form.grossWeight);
    const tare = Number(form.tareWeight);

    if (!form.truckId || !form.driverName.trim()) {
      setError("Select a truck and enter the driver's name.");
      setSaving(false);
      return;
    }

    if (!form.material || !form.source || !form.destination) {
      setError(
        "Select a material, source location, and destination location."
      );
      setSaving(false);
      return;
    }

    if (!Number.isFinite(gross) || gross <= 0) {
      setError("Gross weight must be greater than zero.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(tare) || tare < 0) {
      setError("Tare weight cannot be negative.");
      setSaving(false);
      return;
    }

    if (gross < tare) {
      setError("Gross weight cannot be less than tare weight.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        ticketNumber: form.ticketNumber,
        driverName: form.driverName.trim(),
        grossWeight: gross,
        tareWeight: tare,
      };

      const response = await api.post("/weighbridge", payload);

      setSuccess(
        response.data?.message ||
          "Weighbridge ticket created successfully."
      );

      setForm(createEmptyForm());

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to record weighbridge ticket."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Weighbridge</h1>
          <p>
            Record truck weights and associate each ticket with a
            material, source location, and destination location.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={loadData}
          disabled={loading || saving}
        >
          Refresh
        </button>
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
          <h2 className="h5 mb-3">Create weighbridge ticket</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Ticket number</label>
                <input
                  className="form-control"
                  name="ticketNumber"
                  value={form.ticketNumber}
                  readOnly
                  required
                />
                <small className="text-muted">
                  Automatically generated.
                </small>
              </div>

              <div className="col-md-3">
                <label className="form-label">Truck</label>
                <select
                  className="form-select"
                  name="truckId"
                  value={form.truckId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select truck</option>
                  {trucks.map((truck) => (
                    <option
                      key={truck._id || truck.id}
                      value={truck._id || truck.id}
                    >
                      {truck.registrationNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Driver</label>
                <input
                  className="form-control"
                  name="driverName"
                  value={form.driverName}
                  onChange={handleChange}
                  required
                  maxLength={150}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Material</label>
                <select
                  className="form-select"
                  name="material"
                  value={form.material}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select material</option>
                  {materials.map((material) => (
                    <option
                      key={material._id || material.id}
                      value={material.name}
                    >
                      {material.code} — {material.name} ({material.unit})
                    </option>
                  ))}
                </select>

                {materials.length === 0 && (
                  <small className="text-muted">
                    No active materials found.
                  </small>
                )}
              </div>

              <div className="col-md-3">
                <label className="form-label">Gross weight (t)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.001"
                  min="0.001"
                  name="grossWeight"
                  value={form.grossWeight}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Tare weight (t)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.001"
                  min="0"
                  name="tareWeight"
                  value={form.tareWeight}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Source location</label>
                <select
                  className="form-select"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select source</option>
                  {locations.map((location) => (
                    <option
                      key={location._id || location.id}
                      value={location.name}
                    >
                      {location.code} — {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Destination location</label>
                <select
                  className="form-select"
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select destination</option>
                  {locations.map((location) => (
                    <option
                      key={location._id || location.id}
                      value={location.name}
                    >
                      {location.code} — {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  maxLength={1000}
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || loading}
                >
                  {saving ? "Recording..." : "Record weight"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Recent weighbridge records</h2>

          {loading ? (
            <p>Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-muted">
              No weighbridge tickets available.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Truck</th>
                    <th>Material</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Gross (t)</th>
                    <th>Tare (t)</th>
                    <th>Net (t)</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket._id || ticket.id}>
                      <td>{ticket.ticketNumber || "—"}</td>
                      <td>
                        {ticket.truck?.registrationNumber || "—"}
                      </td>
                      <td>{ticket.material || "—"}</td>
                      <td>{ticket.source || "—"}</td>
                      <td>{ticket.destination || "—"}</td>
                      <td>{ticket.grossWeight ?? "—"}</td>
                      <td>{ticket.tareWeight ?? "—"}</td>
                      <td>
                        {ticket.netWeight ??
                          (
                            Number(ticket.grossWeight) -
                            Number(ticket.tareWeight)
                          ).toFixed(3)}
                      </td>
                      <td>{ticket.status || "—"}</td>
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
