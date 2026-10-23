
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  maintenanceReference: generateReference("MNT"),
  equipment: "",
  maintenanceType: "preventive",
  scheduledDate: "",
  dueOperatingHours: "0",
  actualServiceDate: "",
  actualMeterReading: "0",
  workPerformed: "",
  laborCost: "0",
  partsCost: "0",
  otherCost: "0",
  serviceProvider: "",
  status: "completed",
});

const getId = (value) => value?.id ?? value?._id ?? "";

const getList = (response, keys = []) => {
  const data = response?.data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

export default function Maintenance() {
  const [maintenance, setMaintenance] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createEmptyForm);

  const loadData = useCallback(async () => {
    const [maintenanceRes, equipmentRes] = await Promise.all([
      api.get("/maintenance"),
      api.get("/equipment"),
    ]);

    setMaintenance(
      getList(maintenanceRes, ["maintenance"])
    );

    setEquipmentList(
      getList(equipmentRes, ["equipment"])
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        await loadData();
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load maintenance records."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
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

    const numericFields = [
      ["dueOperatingHours", "Due operating hours"],
      ["actualMeterReading", "Actual meter reading"],
      ["laborCost", "Labour cost"],
      ["partsCost", "Parts cost"],
      ["otherCost", "Other cost"],
    ];

    for (const [field, label] of numericFields) {
      const value = Number(form[field]);

      if (!Number.isFinite(value) || value < 0) {
        setError(`${label} must be a valid non-negative number.`);
        setSaving(false);
        return;
      }
    }

    if (!form.equipment) {
      setError("Select the equipment being serviced.");
      setSaving(false);
      return;
    }

    if (!form.workPerformed.trim()) {
      setError("Enter the maintenance work performed or planned.");
      setSaving(false);
      return;
    }

    if (
      form.status === "completed" &&
      !form.actualServiceDate
    ) {
      setError("Enter the actual service date for completed maintenance.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        maintenanceReference: form.maintenanceReference,
        scheduledDate: form.scheduledDate
          ? new Date(form.scheduledDate).toISOString()
          : null,
        actualServiceDate: form.actualServiceDate
          ? new Date(form.actualServiceDate).toISOString()
          : null,
        dueOperatingHours: Number(form.dueOperatingHours),
        actualMeterReading: Number(form.actualMeterReading),
        laborCost: Number(form.laborCost),
        partsCost: Number(form.partsCost),
        otherCost: Number(form.otherCost),
        serviceProvider: form.serviceProvider.trim(),
        workPerformed: form.workPerformed.trim(),
      };

      await api.post("/maintenance", payload);

      setSuccess("Maintenance entry recorded successfully.");
      setForm(createEmptyForm());

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create maintenance entry."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Maintenance</h1>
          <p>
            Schedule and record preventive and corrective maintenance work.
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
          <h2 className="h5 mb-3">Log maintenance</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label
                  className="form-label"
                  htmlFor="maintenanceReference"
                >
                  Reference
                </label>

                <input
                  id="maintenanceReference"
                  className="form-control"
                  name="maintenanceReference"
                  value={form.maintenanceReference}
                  readOnly
                  required
                />

                <small className="text-muted">
                  Automatically generated.
                </small>
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="equipment">
                  Equipment
                </label>

                <select
                  id="equipment"
                  className="form-select"
                  name="equipment"
                  value={form.equipment}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select equipment</option>

                  {equipmentList.map((item) => {
                    const id = getId(item);

                    return (
                      <option key={id} value={id}>
                        {item.code ? `${item.code} — ` : ""}
                        {item.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="maintenanceType">
                  Type
                </label>

                <select
                  id="maintenanceType"
                  className="form-select"
                  name="maintenanceType"
                  value={form.maintenanceType}
                  onChange={handleChange}
                >
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="status">
                  Status
                </label>

                <select
                  id="status"
                  className="form-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="serviceProvider">
                  Service provider
                </label>

                <input
                  id="serviceProvider"
                  className="form-control"
                  name="serviceProvider"
                  value={form.serviceProvider}
                  onChange={handleChange}
                  maxLength={150}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="scheduledDate">
                  Scheduled date
                </label>

                <input
                  id="scheduledDate"
                  type="datetime-local"
                  className="form-control"
                  name="scheduledDate"
                  value={form.scheduledDate}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="actualServiceDate">
                  Actual service date
                </label>

                <input
                  id="actualServiceDate"
                  type="datetime-local"
                  className="form-control"
                  name="actualServiceDate"
                  value={form.actualServiceDate}
                  onChange={handleChange}
                  required={form.status === "completed"}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="dueOperatingHours">
                  Due hours
                </label>

                <input
                  id="dueOperatingHours"
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-control"
                  name="dueOperatingHours"
                  value={form.dueOperatingHours}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="actualMeterReading">
                  Meter reading
                </label>

                <input
                  id="actualMeterReading"
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-control"
                  name="actualMeterReading"
                  value={form.actualMeterReading}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="laborCost">
                  Labour cost
                </label>

                <input
                  id="laborCost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  name="laborCost"
                  value={form.laborCost}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="partsCost">
                  Parts cost
                </label>

                <input
                  id="partsCost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  name="partsCost"
                  value={form.partsCost}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="otherCost">
                  Other cost
                </label>

                <input
                  id="otherCost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  name="otherCost"
                  value={form.otherCost}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="workPerformed">
                  Work performed / planned
                </label>

                <textarea
                  id="workPerformed"
                  className="form-control"
                  name="workPerformed"
                  rows={3}
                  maxLength={3000}
                  value={form.workPerformed}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || loading || equipmentList.length === 0}
                >
                  {saving ? "Saving..." : "Save maintenance"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Maintenance history</h2>

          {loading ? (
            <p>Loading maintenance...</p>
          ) : maintenance.length === 0 ? (
            <p className="text-muted">No maintenance records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Service date</th>
                    <th>Total cost</th>
                  </tr>
                </thead>

                <tbody>
                  {maintenance.map((item) => {
                    const totalCost =
                      Number(item.laborCost || 0) +
                      Number(item.partsCost || 0) +
                      Number(item.otherCost || 0);

                    return (
                      <tr key={getId(item)}>
                        <td>{item.maintenanceReference || "—"}</td>
                        <td>
                          {item.equipment?.name ||
                            item.equipment?.code ||
                            "—"}
                        </td>
                        <td>{item.maintenanceType || "—"}</td>
                        <td>{item.status || "—"}</td>
                        <td>
                          {item.actualServiceDate
                            ? new Date(
                                item.actualServiceDate
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          {totalCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
