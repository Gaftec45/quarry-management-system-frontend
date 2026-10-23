
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  code: generateReference("MAT"),
  name: "",
  category: "general",
  unit: "ton",
  isActive: true,
});

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createEmptyForm);

  const loadMaterials = async () => {
    const response = await api.get("/inventory/materials");
    setMaterials(response.data.materials || []);
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/inventory/materials");

        if (active) {
          setMaterials(response.data.materials || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load materials."
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
    setSaving(true);

    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        category: form.category.trim() || "general",
        isActive: Boolean(form.isActive),
      };

      const response = await api.post(
        "/inventory/materials",
        payload
      );

      setSuccess(
        response.data.message || "Material created successfully."
      );

      setForm(createEmptyForm());

      await loadMaterials();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create material."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Materials</h1>
          <p>
            Master list of quarry materials used in stock balances
            and production postings.
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
          <h2 className="h5 mb-3">Create material</h2>

          <form onSubmit={handleCreate}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label" htmlFor="materialCode">
                  Material code
                </label>
                <input
                  id="materialCode"
                  className="form-control"
                  value={form.code}
                  readOnly
                  required
                />
                <small className="text-muted">
                  Generated automatically
                </small>
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="materialName">
                  Name
                </label>
                <input
                  id="materialName"
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
                  htmlFor="materialCategory"
                >
                  Category
                </label>
                <input
                  id="materialCategory"
                  className="form-control"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>

              <div className="col-md-2">
                <label className="form-label" htmlFor="materialUnit">
                  Unit
                </label>
                <select
                  id="materialUnit"
                  className="form-select"
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                >
                  <option value="ton">ton</option>
                  <option value="kg">kg</option>
                  <option value="m3">m3</option>
                  <option value="bag">bag</option>
                  <option value="piece">piece</option>
                  <option value="litre">litre</option>
                </select>
              </div>

              <div className="col-md-1">
                <label
                  className="form-label"
                  htmlFor="materialStatus"
                >
                  Status
                </label>
                <select
                  id="materialStatus"
                  className="form-select"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isActive: e.target.value === "active",
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Create material"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Approved material register</h2>

          {loading ? (
            <p>Loading materials...</p>
          ) : materials.length === 0 ? (
            <p className="text-muted">
              No materials registered yet.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {materials.map((material) => (
                    <tr key={material.id || material._id}>
                      <td>{material.code}</td>
                      <td>{material.name}</td>
                      <td>{material.category || "general"}</td>
                      <td>{material.unit}</td>
                      <td>
                        <span
                          className={`badge ${
                            material.isActive
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {material.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
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

export default Materials;
