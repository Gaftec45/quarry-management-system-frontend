
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  breakdownReference: generateReference("BRK"),
  equipment: "",
  severity: "major",
  status: "reported",
  category: "hydraulic",
  description: "",
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

export default function Breakdowns() {
  const [breakdowns, setBreakdowns] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createEmptyForm);

  const loadData = useCallback(async () => {
    const [breakdownsRes, equipmentRes] = await Promise.all([
      api.get("/breakdowns"),
      api.get("/equipment"),
    ]);

    setBreakdowns(
      getList(breakdownsRes, ["breakdowns"])
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
              "Unable to load breakdown records."
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

    if (!form.equipment) {
      setError("Select the equipment involved in the breakdown.");
      setSaving(false);
      return;
    }

    if (!form.description.trim()) {
      setError("Enter a description of the breakdown.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        breakdownReference: form.breakdownReference,
        description: form.description.trim(),
        reportedAt: new Date().toISOString(),
      };

      await api.post("/breakdowns", payload);

      setSuccess("Breakdown recorded successfully.");
      setForm(createEmptyForm());

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create breakdown report."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Breakdowns</h1>
          <p>
            Report equipment downtime and maintain a breakdown history.
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
          <h2 className="h5 mb-3">Create breakdown report</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label" htmlFor="breakdownReference">
                  Reference
                </label>

                <input
                  id="breakdownReference"
                  className="form-control"
                  name="breakdownReference"
                  value={form.breakdownReference}
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

                {equipmentList.length === 0 && (
                  <small className="text-muted">
                    No equipment records found.
                  </small>
                )}
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="severity">
                  Severity
                </label>

                <select
                  id="severity"
                  className="form-select"
                  name="severity"
                  value={form.severity}
                  onChange={handleChange}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
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
                  <option value="reported">Reported</option>
                  <option value="under_repair">Under repair</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="category">
                  Category
                </label>

                <select
                  id="category"
                  className="form-select"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="hydraulic">Hydraulic</option>
                  <option value="electrical">Electrical</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="structural">Structural</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  className="form-control"
                  name="description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
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
                  {saving ? "Saving..." : "Submit breakdown"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Breakdown history</h2>

          {loading ? (
            <p>Loading breakdown data...</p>
          ) : breakdowns.length === 0 ? (
            <p className="text-muted">No breakdowns reported.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Equipment</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Description</th>
                  </tr>
                </thead>

                <tbody>
                  {breakdowns.map((item) => (
                    <tr key={getId(item)}>
                      <td>{item.breakdownReference || "—"}</td>

                      <td>
                        {item.equipment?.name ||
                          item.equipment?.code ||
                          "—"}
                      </td>

                      <td>
                        <span className="badge text-bg-secondary">
                          {item.severity || "—"}
                        </span>
                      </td>

                      <td>{item.status || "—"}</td>
                      <td>{item.category || "—"}</td>
                      <td>{item.description || "—"}</td>
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
