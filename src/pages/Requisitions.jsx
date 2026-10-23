
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyLine = () => ({
  material: "",
  quantity: 1,
  unit: "ton",
  unitCost: 0,
});

const createEmptyForm = () => ({
  requisitionNumber: generateReference("REQ"),
  department: "operations",
  currency: "NGN",
  items: [createEmptyLine()],
});

function getRequisitions(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.requisitions)) return data.requisitions;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/procurement/requisitions");
      setRequisitions(getRequisitions(response));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load requisitions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const updateLine = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }));

    setError("");
    setSuccess("");
  };

  const addLine = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, createEmptyLine()],
    }));
  };

  const removeLine = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.items.length) {
      setError("Add at least one requisition item.");
      return;
    }

    const invalidItem = form.items.some(
      (item) =>
        !item.material.trim() ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(Number(item.unitCost)) ||
        Number(item.unitCost) < 0
    );

    if (invalidItem) {
      setError(
        "Enter a material ID for every line. Quantity must be greater than zero, and unit cost cannot be negative."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        requisitionNumber: form.requisitionNumber.trim(),
        items: form.items.map((item) => ({
          ...item,
          material: item.material.trim(),
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      };

      await api.post("/procurement/requisitions", payload);

      setForm(createEmptyForm());
      setSuccess("Purchase requisition created successfully.");

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create requisition."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">
            Create purchase requisition
          </h2>

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

          <form onSubmit={submit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">
                Requisition number
              </label>
              <input
                className="form-control"
                value={form.requisitionNumber}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-4">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={form.department}
                onChange={(e) =>
                  updateForm("department", e.target.value)
                }
              >
                <option value="operations">Operations</option>
                <option value="maintenance">Maintenance</option>
                <option value="factory">Factory</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) =>
                  updateForm("currency", e.target.value)
                }
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="KES">KES</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="col-12">
              <hr />
              <h3 className="h6">Requisition items</h3>
            </div>

            {form.items.map((line, index) => (
              <div className="col-12" key={index}>
                <div className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">
                      Material ID *
                    </label>
                    <input
                      className="form-control"
                      placeholder="Enter material ID"
                      value={line.material}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "material",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0.001"
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "quantity",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-select"
                      value={line.unit}
                      onChange={(e) =>
                        updateLine(index, "unit", e.target.value)
                      }
                    >
                      <option value="ton">ton</option>
                      <option value="kg">kg</option>
                      <option value="m3">m³</option>
                      <option value="bag">bag</option>
                      <option value="piece">piece</option>
                      <option value="litre">litre</option>
                    </select>
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">
                      Unit cost *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="any"
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "unitCost",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      onClick={() => removeLine(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="col-12">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={addLine}
              >
                Add line
              </button>
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || loading}
              >
                {saving ? "Saving..." : "Save requisition"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Requisition list</h2>

          {loading ? (
            <p>Loading requisitions...</p>
          ) : requisitions.length === 0 ? (
            <p className="text-muted mb-0">
              No requisitions found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {requisitions.map((requisition) => (
                    <tr key={requisition._id || requisition.id}>
                      <td>
                        {requisition.requisitionNumber || "—"}
                      </td>
                      <td className="text-capitalize">
                        {requisition.department || "—"}
                      </td>
                      <td>{requisition.status || "—"}</td>
                      <td>
                        {requisition.total ?? "—"}{" "}
                        {requisition.currency || ""}
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
