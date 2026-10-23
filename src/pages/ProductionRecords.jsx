import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateIdempotencyKey, generateReference } from "../utils/referenceGenerator";

const emptyForm = {
  productionDate: new Date().toISOString().slice(0, 16),
  shift: "day",
  sourceLocation: "",
  destinationLocation: "",
  material: "",
  quantity: "",
  unit: "ton",
  equipmentIdentifier: "",
  operatingHours: "",
  fuelUsage: "",
  downtimeHours: "",
  notes: "",
};

const getEntityId = (record) => record?.id ?? record?._id ?? "";

function ProductionRecords() {
  const [productions, setProductions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createEmptyForm = () => ({
  ...emptyForm,
  productionReference: generateReference("PRD"),
  idempotencyKey: generateIdempotencyKey("prod"),
});

const [form, setForm] = useState(createEmptyForm);

  const loadAll = async () => {
    try {
      const [productionsRes, locationsRes, materialsRes] = await Promise.all([
        api.get("/productions"),
        api.get("/inventory/locations"),
        api.get("/inventory/materials"),
      ]);

      setProductions(productionsRes.data.productions || []);
      setLocations((locationsRes.data.locations || []).filter((location) => location.status === "active"));
      setMaterials(materialsRes.data.materials || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load production data.");
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadAll();
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Unable to load production data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        productionDate: new Date(form.productionDate).toISOString(),
        quantity: Number(form.quantity),
        operatingHours: Number(form.operatingHours || 0),
        fuelUsage: Number(form.fuelUsage || 0),
        downtimeHours: Number(form.downtimeHours || 0),
      };

      const response = await api.post("/productions", payload);
      setSuccess(response.data.message || "Production record posted successfully.");
      setForm(createEmptyForm());
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create production record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Production Records</h1>
          <p>Create production runs and immediately post stock movement to the ledger.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Create production posting</h2>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
<div className="col-md-3">
  <label className="form-label">Production ref</label>
  <input
    className="form-control"
    value={form.productionReference}
    readOnly
    required
  />
</div>
              <div className="col-md-3">
                <label className="form-label">Date</label>
                <input type="datetime-local" className="form-control" value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Shift</label>
                <select className="form-select" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Origin</label>
                <select className="form-select" value={form.sourceLocation} onChange={(e) => setForm({ ...form, sourceLocation: e.target.value })} required>
                  <option value="">Select source</option>
                  {locations.map((location) => (
                    <option key={getEntityId(location)} value={getEntityId(location)}>{location.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Destination</label>
                <select className="form-select" value={form.destinationLocation} onChange={(e) => setForm({ ...form, destinationLocation: e.target.value })} required>
                  <option value="">Select destination</option>
                  {locations.map((location) => (
                    <option key={getEntityId(location)} value={getEntityId(location)}>{location.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Material</label>
                <select className="form-select" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required>
                  <option value="">Select material</option>
                  {materials.map((material) => (
                    <option key={getEntityId(material)} value={getEntityId(material)}>{material.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Quantity</label>
                <input className="form-control" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="ton">ton</option>
                  <option value="kg">kg</option>
                  <option value="m3">m3</option>
                  <option value="bag">bag</option>
                  <option value="piece">piece</option>
                  <option value="litre">litre</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Equipment</label>
                <input className="form-control" value={form.equipmentIdentifier} onChange={(e) => setForm({ ...form, equipmentIdentifier: e.target.value })} />
              </div>
              <div className="col-md-1">
                <label className="form-label">Hours</label>
                <input className="form-control" type="number" step="0.01" value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} />
              </div>
              <div className="col-md-1">
                <label className="form-label">Fuel</label>
                <input className="form-control" type="number" step="0.01" value={form.fuelUsage} onChange={(e) => setForm({ ...form, fuelUsage: e.target.value })} />
              </div>
              <div className="col-md-1">
                <label className="form-label">Down</label>
                <input className="form-control" type="number" step="0.01" value={form.downtimeHours} onChange={(e) => setForm({ ...form, downtimeHours: e.target.value })} />
              </div>
<div className="col-md-12">
  <label className="form-label">Idempotency key</label>
  <input
    className="form-control"
    value={form.idempotencyKey}
    readOnly
    required
  />
</div>
              <div className="col-md-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Posting..." : "Post production"}</button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5">Recent production</h2>
          {loading ? (
            <p>Loading production records...</p>
          ) : productions.length === 0 ? (
            <p className="text-muted">No production records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Material</th>
                    <th>Destination</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {productions.map((production) => (
                    <tr key={production._id}>
                      <td>{production.productionReference}</td>
                      <td>{production.material?.name || "—"}</td>
                      <td>{production.destinationLocation?.name || "—"}</td>
                      <td>{production.quantity} {production.unit}</td>
                      <td>{production.postingStatus}</td>
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

export default ProductionRecords;
